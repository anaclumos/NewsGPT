"use server"

import {
  deleteNotificationChannel,
  upsertNotificationChannel,
} from "@/app/actions/notification-channels"
import { FormState } from "@/types/forms"
import { NotificationChannelType } from "@prisma/client"
import { redirect } from "next/navigation"

export async function deleteChannelAction(channelId: string): Promise<void> {
  await deleteNotificationChannel(channelId)
  redirect("/notification-channels")
}

export async function submitChannelAction(
  prevState: FormState | null,
  formData: FormData,
): Promise<FormState | null> {
  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const type = formData.get("type") as NotificationChannelType
  const settingsStr = formData.get("settings") as string
  let settings = {}

  if (!name?.trim()) {
    return {
      success: false,
      statusTitle: "Validation Error",
      statusDescription: "Name is required",
    }
  }

  try {
    settings = JSON.parse(settingsStr)
  } catch (error) {
    console.error("Invalid JSON settings:", error)
    return {
      success: false,
      statusTitle: "Invalid Settings",
      statusDescription: "Invalid JSON settings",
    }
  }

  await upsertNotificationChannel({
    id,
    name,
    description,
    type,
    settings,
  })

  redirect("/notification-channels")
  return {
    success: true,
  }
}
