import React from 'react'
import { Navigate, useParams } from 'react-router-dom'

interface AdminRedirectProps {
  to: string
}

/**
 * Composant pour rediriger les anciennes routes /admin/* vers /app/*
 * Gère correctement les paramètres d'URL comme :id
 */
const AdminRedirect: React.FC<AdminRedirectProps> = ({ to }) => {
  const params = useParams()
  
  // Construire le nouveau chemin avec les paramètres
  let newPath = to
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      newPath = newPath.replace(`:${key}`, value)
    }
  })
  
  return <Navigate to={newPath} replace />
}

export default AdminRedirect
