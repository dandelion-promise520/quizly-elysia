import { Magnetic } from '../magnetic'
import { Button, type ButtonProps } from './base'

export interface MagneticButtonProps extends ButtonProps {
  strength?: number
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
