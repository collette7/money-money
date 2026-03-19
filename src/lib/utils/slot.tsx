import * as React from "react"

export function Slot({ children, ...props }: React.HTMLAttributes<HTMLElement>) {
  if (!React.isValidElement(children)) {
    return null
  }
  
  const childElement = children as React.ReactElement<any>
  
  return React.cloneElement(childElement, {
    ...props,
    ...childElement.props,
    className: [props.className, childElement.props.className].filter(Boolean).join(" "),
  })
}

Slot.Root = Slot