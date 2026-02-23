import Link from "next/link"
import { ArrowLeft, ExternalLink, KeyRound, ShieldCheck, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { connectSimpleFin } from "../actions"
import { ConnectSubmitButton } from "./connect-form"

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/accounts">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Connect via SimpleFIN
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Link your bank accounts automatically with SimpleFIN Bridge.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-emerald-600" />
                What is SimpleFIN?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                SimpleFIN Bridge is a privacy-focused service that securely connects
                your bank accounts to personal finance apps. Your credentials are
                never shared with us.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
                    <Zap className="size-3" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Automatic syncing</p>
                    <p className="text-xs">Balances and transactions update regularly</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
                    <ShieldCheck className="size-3" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Privacy first</p>
                    <p className="text-xs">Read-only access, no account modifications</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/50">
                    <KeyRound className="size-3" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">$15/year</p>
                    <p className="text-xs">One-time annual subscription via SimpleFIN</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Setup Token</CardTitle>
            <CardDescription>
              Follow these steps to connect your accounts:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={connectSimpleFin} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    1
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Create a SimpleFIN token
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Visit SimpleFIN Bridge to create your setup token.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href="https://bridge.simplefin.org/simplefin/create"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open SimpleFIN
                      <ExternalLink className="size-3" />
                    </a>
                  </Button>
                </div>

                <div className="border-l-2 border-dashed ml-3.5 h-4" />

                <div className="flex items-start gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    2
                  </span>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium">
                        Paste your setup token
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Copy the token from SimpleFIN and paste it below.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="token" className="sr-only">
                        SimpleFIN Token
                      </Label>
                      <Textarea
                        id="token"
                        name="token"
                        placeholder="aHR0cHM6Ly9icmlkZ2Uuc2lt..."
                        rows={3}
                        className="font-mono text-xs resize-none break-all overflow-hidden w-full max-w-full"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="border-l-2 border-dashed ml-3.5 h-4" />

                <div className="flex items-start gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    3
                  </span>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium">
                        Transaction history
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        How far back should we import transactions?
                      </p>
                    </div>
                    <Select name="lookback" defaultValue="90">
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                        <SelectItem value="180">Last 6 months</SelectItem>
                        <SelectItem value="365">Last 1 year</SelectItem>
                        <SelectItem value="1095">Last 3 years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-l-2 border-dashed ml-3.5 h-4" />

                <div className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    4
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Connect accounts</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      We&apos;ll fetch your accounts and start syncing.
                    </p>
                  </div>
                </div>
              </div>

              <ConnectSubmitButton />
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
