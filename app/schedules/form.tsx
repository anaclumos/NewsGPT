"use client"

import { NavBar } from "@/components/nav-bar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Divider } from "@/components/ui/divider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { daysOfWeek } from "@/lib/const"
import { getCronDescription } from "@/lib/cron"
import { toast } from "@/lib/use-toast"
import { FormState } from "@/types/forms"
import type { Schedule } from "@prisma/client"
import Link from "next/link"
import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { deleteScheduleAction, submitScheduleAction } from "./server"

interface ScheduleFormProps {
  schedule?: Schedule
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </Button>
  )
}

export function ScheduleForm({ schedule }: ScheduleFormProps) {
  // Parse initial cron expression or set defaults
  const initialCronParts = schedule?.cron.split(" ") || [
    "0",
    "8",
    "*",
    "*",
    "*",
  ]
  const [hour, setHour] = useState(initialCronParts[1])
  const [minute, setMinute] = useState(initialCronParts[0])
  const [timezone, setTimezone] = useState(
    schedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  )

  // Parse days from cron expression or set all days by default
  const initialDays = new Set<string>()
  if (schedule) {
    const daysPart = initialCronParts[4]
    if (daysPart !== "*") {
      if (daysPart.includes("-")) {
        // Handle range (e.g., MON-FRI)
        const [start, end] = daysPart.split("-")
        const startIndex = daysOfWeek.findIndex((d) => d.id === start)
        const endIndex = daysOfWeek.findIndex((d) => d.id === end)
        for (let i = startIndex; i <= endIndex; i++) {
          initialDays.add(daysOfWeek[i].id)
        }
      } else {
        // Handle comma-separated list
        daysPart.split(",").forEach((day) => initialDays.add(day))
      }
    }
  } else {
    // Set all days selected by default for new schedules
    daysOfWeek.forEach((day) => initialDays.add(day.id))
  }
  const [selectedDays, setSelectedDays] = useState<Set<string>>(initialDays)

  const [status, formAction] = useActionState<FormState | null, FormData>(
    submitScheduleAction,
    null,
  )
  const breadcrumbs = [
    { title: "Home", href: "/" },
    { title: "Schedules", href: "/schedules" },
    ...(schedule?.id
      ? [
          {
            title: schedule.name || "New Schedule",
            href: `/schedules/${schedule.id}`,
          },
        ]
      : [{ title: "New Schedule", href: "/schedules/new" }]),
  ]

  if (status && !status.success) {
    toast({
      title: status.statusTitle || "Error",
      description: status.statusDescription || "An error occurred",
      variant: "error",
    })
  }

  function handleDayCheckedChange(dayId: string, checked: boolean) {
    setSelectedDays((prev) => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(dayId)
      } else {
        newSet.delete(dayId)
      }
      return newSet
    })
  }

  return (
    <div className="flex flex-col pb-4">
      <NavBar
        breadcrumbs={breadcrumbs}
        actions={
          <>
            {schedule?.id && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">Delete</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Schedule</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this schedule? This action
                      cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="secondary">Cancel</Button>
                    </DialogClose>
                    <form action={() => deleteScheduleAction(schedule.id)}>
                      <Button variant="destructive">Delete</Button>
                    </form>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </>
        }
      />

      <form action={formAction}>
        <input type="hidden" name="id" value={schedule?.id} />
        <div>
          <div className="grid grid-cols-1 gap-10 p-4 md:grid-cols-3 md:p-8">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-50">
                Schedule Information
              </h2>
              <p className="mt-1 text-sm/6 text-gray-500 dark:text-gray-500">
                {schedule
                  ? "Edit your schedule configuration."
                  : "Create a new schedule to run your reporters at specific times."}
              </p>
            </div>
            <div className="md:col-span-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                <div className="col-span-full gap-2 flex flex-col">
                  <Label htmlFor="name" className="font-medium">
                    Name
                  </Label>
                  <Input
                    data-1p-ignore
                    type="text"
                    id="name"
                    name="name"
                    defaultValue={schedule?.name || "New Schedule"}
                    maxLength={100}
                  />
                </div>
              </div>
            </div>
          </div>
          <Divider />
          <div className="grid grid-cols-1 gap-10 p-4 md:grid-cols-3 md:p-8">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-50">
                Time Information
              </h2>
              <p className="mt-1 text-sm/6 text-gray-500 dark:text-gray-500">
                Configure when this schedule should run using the cron
                expression editor.
              </p>
            </div>
            <div className="md:col-span-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                <div className="col-span-full sm:col-span-2 gap-2 flex flex-col">
                  <Label className="font-medium">Hour</Label>
                  <Select
                    name="hour"
                    value={hour}
                    onValueChange={(val) => setHour(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "*",
                        ...Array.from({ length: 24 }, (_, i) => i.toString()),
                      ].map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === "*" ? "Every" : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-full sm:col-span-2 gap-2 flex flex-col">
                  <Label className="font-medium">Minute</Label>
                  <Select
                    name="minute"
                    value={minute}
                    onValueChange={(val) => setMinute(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        ...(process.env.NODE_ENV === "development"
                          ? ["*"]
                          : []),
                        "0",
                        "15",
                        "30",
                        "45",
                      ].map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === "*" ? "Every" : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-full sm:col-span-2 gap-2 flex flex-col">
                  <Label className="font-medium">Timezone</Label>
                  <Select
                    name="timezone"
                    value={timezone}
                    onValueChange={(val) => setTimezone(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Intl.supportedValuesOf("timeZone").map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-full">
                  <fieldset className="mt-6">
                    <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
                      Days of Week
                    </legend>
                    <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
                      {daysOfWeek.map((day) => (
                        <li
                          key={day.id}
                          className="flex items-center gap-x-3 py-3"
                        >
                          <Checkbox
                            id={`day-${day.id}`}
                            name="selectedDays"
                            value={day.id}
                            checked={selectedDays.has(day.id)}
                            onCheckedChange={(checked) =>
                              handleDayCheckedChange(day.id, !!checked)
                            }
                          />
                          <Label
                            htmlFor={`day-${day.id}`}
                            className="font-medium"
                          >
                            {day.label}
                          </Label>
                        </li>
                      ))}
                    </ul>
                  </fieldset>
                </div>

                <div className="col-span-full text-sm text-gray-600 dark:text-gray-400">
                  {getCronDescription({ minute, hour, selectedDays, timezone })}
                </div>
              </div>
            </div>
          </div>
          <Divider />
          <div className="flex items-center justify-end gap-2 p-4">
            <Link href="/schedules">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
            <SubmitButton
              label={schedule ? "Save Changes" : "Create Schedule"}
            />
          </div>
        </div>
      </form>
    </div>
  )
}
