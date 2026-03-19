import * as React from "react"
import { Input as BaseInput } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<typeof BaseInput> {
  type?: string
}

function Input({ className, type, ...props }: InputProps) {
  const inputClasses = cn(
    "input",
    type === "file" && "input__file",
    className
  )
  
  return (
    <BaseInput
      type={type}
      className={inputClasses}
      {...props}
    />
  )
}

export { Input }
