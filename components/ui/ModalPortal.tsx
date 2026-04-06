'use client'

import { createPortal } from 'react-dom'

interface Props {
  children: React.ReactNode
}

export default function ModalPortal({ children }: Props) {
  return createPortal(children, document.body)
}
