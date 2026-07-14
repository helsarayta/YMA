import { useCallback, useEffect, useRef, useState } from "react"
import { friendlyError } from "../friendlyError"

interface Options {
  // Streams audio to the backend; onDelta is called for each chunk.
  analyzeStream: (
    base64: string,
    mimeType: string,
    onDelta: (t: string) => void
  ) => Promise<void>
  onAnswerStart: () => void
  onAnswerDelta: (text: string) => void
  onLoadingChange?: (loading: boolean) => void
  onError?: (message: string) => void
  maxSeconds?: number
}

const TIMESLICE_MS = 1000

/**
 * Rolling ~20-second buffer from the phone microphone. Sends the latest chunk to
 * the backend on answerNow(). Shorter buffer = lighter audio = faster answers.
 * mimeType is dynamic: iOS Safari -> audio/mp4, Android/Chrome -> audio/webm.
 * Wake Lock keeps the phone screen on while listening.
 */
export function useInterviewListener({
  analyzeStream,
  onAnswerStart,
  onAnswerDelta,
  onLoadingChange,
  onError,
  maxSeconds = 20
}: Options) {
  const [isListening, setIsListening] = useState(false)
  const [isAnswering, setIsAnswering] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const headerChunkRef = useRef<Blob | null>(null)
  const rollingRef = useRef<Blob[]>([])
  const mimeRef = useRef<string>("audio/webm")
  const startingRef = useRef(false)
  const wakeLockRef = useRef<any>(null)

  const resetBuffer = () => {
    headerChunkRef.current = null
    rollingRef.current = []
  }

  const releaseWakeLock = () => {
    try {
      wakeLockRef.current?.release?.()
    } catch {
      /* noop */
    }
    wakeLockRef.current = null
  }

  const requestWakeLock = async () => {
    try {
      const wl = (navigator as any).wakeLock
      if (wl?.request) wakeLockRef.current = await wl.request("screen")
    } catch {
      /* wake lock not supported / denied — ignore */
    }
  }

  const stopListening = useCallback(() => {
    try {
      recorderRef.current?.stop()
    } catch {
      /* noop */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    recorderRef.current = null
    streamRef.current = null
    resetBuffer()
    releaseWakeLock()
    setIsListening(false)
  }, [])

  const startListening = useCallback(async () => {
    if (recorderRef.current || startingRef.current) return
    startingRef.current = true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      mimeRef.current = recorder.mimeType || "audio/webm"
      resetBuffer()

      recorder.ondataavailable = (e) => {
        if (!e.data || e.data.size === 0) return
        if (!headerChunkRef.current) {
          headerChunkRef.current = e.data
        } else {
          rollingRef.current.push(e.data)
          if (rollingRef.current.length > maxSeconds) rollingRef.current.shift()
        }
      }

      recorder.start(TIMESLICE_MS)
      recorderRef.current = recorder
      await requestWakeLock()
      setIsListening(true)
    } catch {
      onError?.("Microphone permission denied. Enable mic access in your browser settings.")
    } finally {
      startingRef.current = false
    }
  }, [maxSeconds, onError])

  const getBase64 = useCallback((): Promise<{ base64: string; mimeType: string } | null> => {
    const header = headerChunkRef.current
    if (!header) return Promise.resolve(null)
    const blob = new Blob([header, ...rollingRef.current], { type: mimeRef.current })
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = (reader.result as string) || ""
        const base64 = result.split(",")[1] || ""
        resolve(base64 ? { base64, mimeType: mimeRef.current } : null)
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  }, [])

  const answerNow = useCallback(async () => {
    if (!recorderRef.current) {
      onError?.("Listen mode isn't active yet.")
      return
    }
    if (isAnswering) return
    const buffered = await getBase64()
    if (!buffered) {
      onError?.("No audio recorded yet.")
      return
    }
    setIsAnswering(true)
    onLoadingChange?.(true)
    onAnswerStart()
    try {
      await analyzeStream(buffered.base64, buffered.mimeType, onAnswerDelta)
    } catch (err) {
      onError?.(friendlyError(err))
    } finally {
      setIsAnswering(false)
      onLoadingChange?.(false)
    }
  }, [isAnswering, getBase64, analyzeStream, onAnswerStart, onAnswerDelta, onLoadingChange, onError])

  // Re-acquire wake lock when the tab becomes visible again
  useEffect(() => {
    const onVis = () => {
      if (isListening && document.visibilityState === "visible") requestWakeLock()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [isListening])

  // Release mic + wake lock on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      try {
        recorderRef.current?.stop()
      } catch {
        /* noop */
      }
      releaseWakeLock()
    }
  }, [])

  return { isListening, isAnswering, startListening, stopListening, answerNow }
}
