import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '../config/api'

export type UserAvatarSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<UserAvatarSize, { box: string; text: string }> = {
  sm: { box: 'w-8 h-8', text: 'text-xs' },
  md: { box: 'w-10 h-10', text: 'text-sm' },
  lg: { box: 'w-12 h-12', text: 'text-base' },
}

export interface UserAvatarProps {
  userId: number
  avatar?: string | null
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  size?: UserAvatarSize
  className?: string
}

export const UserAvatar = ({
  userId,
  avatar,
  firstName,
  lastName,
  username,
  size = 'md',
  className = '',
}: UserAvatarProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const { box, text } = sizeClasses[size]

  const initials =
    [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() ||
    username?.[0]?.toUpperCase() ||
    '?'

  useEffect(() => {
    if (!avatar?.trim()) {
      setImageUrl(null)
      return
    }
    let cancelled = false
    const token = sessionStorage.getItem('token')
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    fetch(`${API_BASE_URL}/users/${userId}/avatar?t=${encodeURIComponent(avatar)}`, {
      headers,
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok || cancelled) return null
        return res.blob()
      })
      .then((blob) => {
        if (!blob || cancelled) return
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        const u = URL.createObjectURL(blob)
        objectUrlRef.current = u
        setImageUrl(u)
      })
      .catch(() => {
        if (!cancelled) setImageUrl(null)
      })
    return () => {
      cancelled = true
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [userId, avatar])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  return (
    <div
      className={`${box} rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden flex-shrink-0 ${className}`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className={`text-primary-600 dark:text-primary-400 font-semibold ${text}`}>
          {initials}
        </span>
      )}
    </div>
  )
}
