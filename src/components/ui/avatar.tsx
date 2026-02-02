"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const AvatarContext = React.createContext<{
    status: "loading" | "error" | "loaded",
    setStatus: React.Dispatch<React.SetStateAction<"loading" | "error" | "loaded">>
} | null>(null)

const Avatar = React.forwardRef<
    React.ElementRef<"div">,
    React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
    const [status, setStatus] = React.useState<"loading" | "error" | "loaded">("loading")

    return (
        <AvatarContext.Provider value={{ status, setStatus }}>
            <div
                ref={ref}
                className={cn(
                    "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
                    className
                )}
                {...props}
            />
        </AvatarContext.Provider>
    )
})
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
    React.ElementRef<"img">,
    React.ComponentPropsWithoutRef<"img">
>(({ className, src, ...props }, ref) => {
    const context = React.useContext(AvatarContext)

    React.useEffect(() => {
        if (!context) return

        if (!src) {
            context.setStatus("error")
            return
        }

        const img = new Image()
        // Force string type as we expect a URL string here
        img.src = src as string
        img.onload = () => context.setStatus("loaded")
        img.onerror = () => context.setStatus("error")
        // Reset to loading if src changes?
        return () => {
            img.onload = null
            img.onerror = null
        }
    }, [src, context])

    if (context && context.status !== "loaded") return null

    return (
        <img
            ref={ref}
            src={src}
            className={cn("aspect-square h-full w-full", className)}
            {...props}
        />
    )
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
    React.ElementRef<"div">,
    React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
    const context = React.useContext(AvatarContext)

    if (context && context.status === "loaded") return null

    return (
        <div
            ref={ref}
            className={cn(
                "flex h-full w-full items-center justify-center rounded-full bg-zinc-800 text-zinc-400 font-bold",
                className
            )}
            {...props}
        />
    )
})
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
