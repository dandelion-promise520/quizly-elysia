'use client'
// beui.dev/components/motion/button

import { Magnetic } from '../magnetic'
import { Button, type ButtonProps } from './base'

export interface MagneticButtonProps extends ButtonProps {
  /** Magnetic pull strength. Default 0.25. */
  strength?: number
  /** Class applied to the magnetic wrapper. */
  magneticClassName?: string
}

export const MagneticButton = function MagneticButton(
  { ref, strength = 0.25, magneticClassName, children, ...rest }: MagneticButtonProps & { ref?: React.RefObject<HTMLButtonElement | null> },
) {
  return (
    <Magnetic strength={strength} className={magneticClassName}>
      <Button ref={ref} {...rest}>
        {children}
      </Button>
    </Magnetic>
  )
}
