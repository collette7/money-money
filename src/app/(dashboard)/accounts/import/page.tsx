"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  Loader2,
  Upload,
  XCircle,
  AlertCircle,
  ArrowRightLeft,
  Tag,
  Ban,
} from "lucide-react"

import { AccountIcon } from "@/components/account-icon"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

import { cn } from "@/lib/utils"
import {
  parseCSV,
  parseOFX,
  mapCSVToTransactions,
  type ParsedTransaction,
  type CSVParseResult,
} from "@/lib/parsers"
import { importTransactions, getAccounts } from "./actions"
import type { CategoryMode } from "./actions"
import { EXTERNAL_CATEGORY_MAP } from "@/lib/category-map"

type FileType = "csv" | "ofx" | null
type Step = "upload" | "mapping" | "account" | "importing" | "done"

const DATE_FORMATS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
  { value: "YYYY/MM/DD", label: "YYYY/MM/DD" },
]

const COLUMN_ROLES = [
  { value: "skip", label: "Skip" },
  { value: "date", label: "Date" },
  { value: "amount", label: "Amount" },
  { value: "description", label: "Description" },
  { value: "debit", label: "Debit Amount" },
  { value: "credit", label: "Credit Amount" },
  { value: "merchant_name", label: "Merchant Name" },
  { value: "original_description", label: "Statement Desc" },
  { value: "category", label: "Category" },
  { value: "account", label: "Account" },
  { value: "type", label: "Type" },
  { value: "tags", label: "Tags" },
  { value: "notes", label: "Notes" },
]

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit", label: "Credit Card" },
  { value: "investment", label: "Investment" },
  { value: "loan", label: "Loan" },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

interface ExistingAccount {
  id: string
  name: string
  institution_name: string
  account_type: string
}

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState<Step>("upload")
  const [fileType, setFileType] = useState<FileType>(null)
  const [fileName, setFileName] = useState("")
  const [error, setError] = useState<string | null>(null)

  const [csvData, setCsvData] = useState<CSVParseResult | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({})
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY")

  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([])

  const [existingAccounts, setExistingAccounts] = useState<ExistingAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("new")
  const [newAccountName, setNewAccountName] = useState("")
  const [newAccountType, setNewAccountType] = useState("checking")
  const [newAccountInstitution, setNewAccountInstitution] = useState("")

  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    count: number
  } | null>(null)

  const [importPhase, setImportPhase] = useState<
    "idle" | "parsing" | "mapping" | "reviewing" | "importing" | "complete" | "error"
  >("idle")
  const [progressMessage, setProgressMessage] = useState("")

  const [dragActive, setDragActive] = useState(false)
  const [categoryMode, setCategoryMode] = useState<CategoryMode>("map")

  useEffect(() => {
    startTransition(async () => {
      const accounts = await getAccounts()
      setExistingAccounts(accounts)
    })
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setFileName(file.name)
    setImportPhase("parsing")
    setProgressMessage("Reading file…")
    setImportProgress(10)

    const ext = file.name.split(".").pop()?.toLowerCase()
    const text = await file.text()

    if (ext === "csv") {
      setFileType("csv")
      try {
        setProgressMessage("Parsing CSV data…")
        setImportProgress(30)
        const result = parseCSV(text)
        setCsvData(result)

        const autoMapping: Record<number, string> = {}
        result.headers.forEach((header, i) => {
          const h = header.toLowerCase().trim()
          if (h === "date" || h === "posted date" || h === "transaction date") autoMapping[i] = "date"
          else if (h === "amount" || h === "total") autoMapping[i] = "amount"
          else if (h === "statement description" || h === "original description" || h === "bank description")
            autoMapping[i] = "original_description"
          else if (h === "description" || h === "memo" || h === "name" || h === "payee")
            autoMapping[i] = "description"
          else if (h === "merchant" || h === "merchant name") autoMapping[i] = "merchant_name"
          else if (h === "category" || h === "category name") autoMapping[i] = "category"
          else if (h === "account" || h === "account name") autoMapping[i] = "account"
          else if (h === "type" || h === "transaction type") autoMapping[i] = "type"
          else if (h === "tags" || h === "labels") autoMapping[i] = "tags"
          else if (h === "notes" || h === "note" || h === "comments") autoMapping[i] = "notes"
          else if (h.includes("debit") || h.includes("withdrawal")) autoMapping[i] = "debit"
          else if (h.includes("credit") || h.includes("deposit")) autoMapping[i] = "credit"
          else autoMapping[i] = "skip"
        })

        // If we have both "description" and "original_description", promote description to merchant_name
        const mappingValues = Object.values(autoMapping)
        if (mappingValues.includes("description") && mappingValues.includes("original_description")) {
          const descIdx = Object.entries(autoMapping).find(([, v]) => v === "description")
          const origIdx = Object.entries(autoMapping).find(([, v]) => v === "original_description")
          if (descIdx && origIdx) {
            autoMapping[parseInt(descIdx[0])] = "merchant_name"
            autoMapping[parseInt(origIdx[0])] = "description"
          }
        }

        setColumnMapping(autoMapping)

        // Auto-detect date format from first data row
        const dateColIdx = Object.entries(autoMapping).find(([, v]) => v === "date")
        if (dateColIdx && result.rows[0]) {
          const sample = result.rows[0][parseInt(dateColIdx[0])]?.trim() ?? ""
          if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(sample)) {
            setDateFormat(sample.includes("-") ? "YYYY-MM-DD" : "YYYY/MM/DD")
          } else if (/^\d{2}\/\d{2}\/\d{4}/.test(sample)) {
            setDateFormat("MM/DD/YYYY")
          }
        }
        setImportPhase("mapping")
        setProgressMessage("Map columns to transaction fields")
        setImportProgress(40)
        setStep("mapping")
      } catch (e) {
        setImportPhase("error")
        setProgressMessage("Failed to parse file")
        setImportProgress(0)
        setError(e instanceof Error ? e.message : "Failed to parse CSV file")
      }
    } else if (ext === "ofx" || ext === "qfx") {
      setFileType("ofx")
      try {
        setProgressMessage("Parsing OFX data…")
        setImportProgress(30)
        const transactions = await parseOFX(text)
        setParsedTransactions(transactions)
        setImportPhase("reviewing")
        setProgressMessage(`${transactions.length} transactions ready to import`)
        setImportProgress(60)
        setStep("account")
      } catch (e) {
        setImportPhase("error")
        setProgressMessage("Failed to parse file")
        setImportProgress(0)
        setError(e instanceof Error ? e.message : "Failed to parse OFX/QFX file")
      }
    } else {
      setImportPhase("error")
      setProgressMessage("Unsupported file type")
      setImportProgress(0)
      setError("Unsupported file type. Please upload a .csv, .ofx, or .qfx file.")
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleMappingConfirm = () => {
    if (!csvData) return

    const mappingValues = Object.values(columnMapping)
    const hasDate = mappingValues.includes("date")
    const hasDescription = mappingValues.includes("description")
    const hasAmount = mappingValues.includes("amount")
    const hasDebitCredit =
      mappingValues.includes("debit") && mappingValues.includes("credit")

    if (!hasDate) {
      setError("Please map a column to Date")
      return
    }
    if (!hasDescription) {
      setError("Please map a column to Description")
      return
    }
    if (!hasAmount && !hasDebitCredit) {
      setError("Please map a column to Amount, or map both Debit and Credit columns")
      return
    }

    setError(null)

    const findCol = (role: string) =>
      Object.entries(columnMapping).find(([, v]) => v === role)
    const dateCol = parseInt(findCol("date")?.[0] ?? "0")
    const amountCol = parseInt(findCol("amount")?.[0] ?? "0")
    const descCol = parseInt(findCol("description")?.[0] ?? "0")
    const debitCol = findCol("debit")
    const creditCol = findCol("credit")
    const merchantCol = findCol("merchant_name")
    const origDescCol = findCol("original_description")
    const categoryCol = findCol("category")
    const accountCol = findCol("account")
    const typeCol = findCol("type")
    const tagsCol = findCol("tags")
    const notesCol = findCol("notes")

    try {
      const transactions = mapCSVToTransactions(csvData.rows, {
        date: dateCol,
        amount: amountCol,
        description: descCol,
        debitColumn: debitCol ? parseInt(debitCol[0]) : undefined,
        creditColumn: creditCol ? parseInt(creditCol[0]) : undefined,
        dateFormat,
        merchantName: merchantCol ? parseInt(merchantCol[0]) : undefined,
        originalDescription: origDescCol ? parseInt(origDescCol[0]) : undefined,
        category: categoryCol ? parseInt(categoryCol[0]) : undefined,
        account: accountCol ? parseInt(accountCol[0]) : undefined,
        type: typeCol ? parseInt(typeCol[0]) : undefined,
        tags: tagsCol ? parseInt(tagsCol[0]) : undefined,
        notes: notesCol ? parseInt(notesCol[0]) : undefined,
      })
      setParsedTransactions(transactions)
      setImportPhase("reviewing")
      setProgressMessage(`${transactions.length} transactions ready to import`)
      setImportProgress(60)
      setStep("account")
    } catch (e) {
      setImportPhase("error")
      setProgressMessage("Failed to map columns")
      setImportProgress(0)
      setError(e instanceof Error ? e.message : "Failed to map columns")
    }
  }

  const hasAccountColumn = parsedTransactions.some((tx) => tx.accountName)

  // Compute unique CSV categories and their mappings for the preview
  const categoryPreview = useMemo(() => {
    const counts = new Map<string, number>()
    for (const tx of parsedTransactions) {
      if (!tx.categoryName) continue
      const name = tx.categoryName
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        csvName: name,
        ourName: EXTERNAL_CATEGORY_MAP[name.toLowerCase().trim()] ?? null,
        count,
      }))
  }, [parsedTransactions])

  // Client-side account matching preview for warnings
  const accountMatchPreview = useMemo(() => {
    if (!hasAccountColumn) return new Map<string, string | null>()
    const byAccount = new Map<string, number>()
    for (const tx of parsedTransactions) {
      const name = tx.accountName ?? "Unknown"
      byAccount.set(name, (byAccount.get(name) ?? 0) + 1)
    }

    const matches = new Map<string, string | null>()
    for (const csvName of byAccount.keys()) {
      // Simple client-side match: extract last4, check institution + name keywords
      const last4Match = csvName.match(/\((\d{4})\)\s*$/)
      const last4 = last4Match ? last4Match[1] : null
      const withoutLast4 = csvName.replace(/\s*\(\d{4}\)\s*$/, "").trim()
      const dashIdx = withoutLast4.indexOf(" - ")
      const inst = dashIdx > 0 ? withoutLast4.slice(0, dashIdx).trim().toLowerCase() : withoutLast4.toLowerCase()
      const acctName = dashIdx > 0 ? withoutLast4.slice(dashIdx + 3).trim().toLowerCase() : withoutLast4.toLowerCase()

      const match = existingAccounts.find((a) => {
        const dbInst = (a.institution_name ?? "").toLowerCase()
        const dbName = a.name.toLowerCase()
        if (last4) {
          // When we have last4, require it to be in the account name
          return a.name.includes(last4) && (dbInst.includes(inst) || inst.includes(dbInst))
        }
        // No last4: fuzzy match on institution + account name keywords
        return (
          (dbInst.includes(inst) || inst.includes(dbInst)) &&
          (dbName.includes(acctName) || acctName.includes(dbName) ||
            acctName.split(/\s+/).some((w) => w.length > 3 && dbName.includes(w)))
        )
      })
      matches.set(csvName, match?.name ?? null)
    }
    return matches
  }, [parsedTransactions, existingAccounts, hasAccountColumn])


  const handleImport = () => {
    if (parsedTransactions.length === 0) return

    setStep("importing")
    setImportPhase("importing")
    setProgressMessage("Preparing import…")
    setImportProgress(10)

    startTransition(async () => {
      const isMultiAccount = hasAccountColumn
      setProgressMessage(
        isMultiAccount
          ? `Routing ${parsedTransactions.length} transactions to accounts…`
          : "Creating account if needed…"
      )
      setImportProgress(30)

      const accountId = isMultiAccount
        ? null
        : selectedAccountId === "new"
          ? null
          : selectedAccountId
      const newAccountData =
        !isMultiAccount && selectedAccountId === "new"
          ? {
              name: newAccountName || fileName.replace(/\.\w+$/, ""),
              type: newAccountType,
              institution: newAccountInstitution || "Manual Import",
            }
          : null

      setProgressMessage(
        `Importing ${parsedTransactions.length} transactions (dedup enabled)…`
      )
      setImportProgress(50)

      const result = await importTransactions({
        accountId,
        newAccountData,
        skipDuplicates: true,
        categoryMode,
        transactions: parsedTransactions.map((tx) => ({
          date: tx.date,
          amount: tx.amount,
          description: tx.description,
          merchantName: tx.merchantName,
          originalDescription: tx.originalDescription,
          categoryName: tx.categoryName,
          accountName: tx.accountName,
          type: tx.type,
          tags: tx.tags,
          notes: tx.notes,
        })),
      })

      setImportProgress(100)

      if (result.success) {
        const skipped = result.skipped ?? 0
        const skippedNoAccount = result.skippedNoAccount ?? 0
        const resolved = result.resolvedPending ?? 0
        const parts: string[] = []
        parts.push(`Imported ${result.inserted} transactions`)
        if (skipped > 0) parts.push(`skipped ${skipped} duplicates`)
        if (resolved > 0) parts.push(`resolved ${resolved} pending`)
        if (skippedNoAccount > 0) parts.push(`${skippedNoAccount} skipped (unmatched accounts)`)
        const msg = parts.join(", ")
        setImportPhase("complete")
        setProgressMessage(msg)
        setImportResult({
          success: true,
          message: msg,
          count: result.inserted ?? 0,
        })
      } else {
        setImportPhase("error")
        setProgressMessage(result.error ?? "Import failed")
        setImportResult({
          success: false,
          message: result.error ?? "Import failed",
          count: 0,
        })
      }

      setStep("done")
    })
  }

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
            Import Transactions
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload a CSV, OFX, or QFX file to import your transactions.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {["Upload", "Map Columns", "Select Account", "Import"].map(
          (label, i) => {
            const stepMap: Step[] = ["upload", "mapping", "account", "importing"]
            const currentIdx = stepMap.indexOf(step === "done" ? "importing" : step)
            const isActive = i === currentIdx
            const isComplete = i < currentIdx || step === "done"

            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className={`h-px w-8 ${
                      isComplete ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isComplete
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isComplete && <CheckCircle2 className="size-3" />}
                  {label}
                </div>
              </div>
            )
          }
        )}
      </div>

      {importPhase !== "idle" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {importPhase === "importing" && (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
              )}
              {importPhase === "complete" && (
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
              )}
              {importPhase === "error" && (
                <AlertCircle className="size-3.5 shrink-0 text-destructive" />
              )}
              <span className={cn(
                "text-sm font-medium truncate",
                importPhase === "complete" && "text-emerald-600",
                importPhase === "error" && "text-destructive"
              )}>
                {progressMessage}
              </span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {importPhase === "parsing" && "Step 1 of 3"}
              {importPhase === "mapping" && "Step 1 of 3"}
              {importPhase === "reviewing" && "Step 2 of 3"}
              {importPhase === "importing" && "Step 3 of 3"}
              {importPhase === "complete" && "Complete"}
            </span>
          </div>
          <Progress
            value={importProgress}
            className={cn(
              "h-1.5",
              importPhase === "error" && "[&>div]:bg-destructive",
              importPhase === "complete" && "[&>div]:bg-emerald-500"
            )}
          />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <XCircle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload File</CardTitle>
            <CardDescription>
              Drag and drop your file or click to browse. Supported formats:
              CSV, OFX, QFX.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
            >
              <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
                <Upload className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                Drop your file here, or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supports .csv, .ofx, .qfx files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.ofx,.qfx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === "mapping" && csvData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Column Mapping</CardTitle>
                  <CardDescription>
                    Map each column to the correct transaction field.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <FileSpreadsheet className="size-3" />
                  {fileName}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="space-y-1.5">
                  <Label>Date Format</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMATS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {csvData.headers.map((header, i) => (
                        <TableHead key={i} className="min-w-[140px]">
                          <div className="space-y-2">
                            <Select
                              value={columnMapping[i] ?? "skip"}
                              onValueChange={(v) =>
                                setColumnMapping((prev) => ({
                                  ...prev,
                                  [i]: v,
                                }))
                              }
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COLUMN_ROLES.map((role) => (
                                  <SelectItem
                                    key={role.value}
                                    value={role.value}
                                  >
                                    {role.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="truncate text-xs font-medium">
                              {header}
                            </p>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.rows.slice(0, 5).map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <TableCell
                            key={cellIdx}
                            className={`text-xs ${
                              columnMapping[cellIdx] === "skip"
                                ? "text-muted-foreground/50"
                                : ""
                            }`}
                          >
                            <span className="line-clamp-1">{cell}</span>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {csvData.rows.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  Showing 5 of {csvData.rows.length} rows
                </p>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("upload")
                    setCsvData(null)
                    setFileType(null)
                    setError(null)
                  }}
                >
                  Back
                </Button>
                <Button onClick={handleMappingConfirm}>
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "account" && (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">
                {hasAccountColumn ? "Multi-Account Import" : "Select Account"}
              </CardTitle>
              <CardDescription>
                {hasAccountColumn
                  ? `${parsedTransactions.length} transactions will be routed to accounts automatically. Duplicates will be skipped.`
                  : `Choose which account to import ${parsedTransactions.length} transactions into.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasAccountColumn ? (
                <div className="space-y-3">
                  {(() => {
                    const byAccount = new Map<string, number>()
                    for (const tx of parsedTransactions) {
                      const name = tx.accountName ?? "Unknown"
                      byAccount.set(name, (byAccount.get(name) ?? 0) + 1)
                    }
                    return [...byAccount.entries()].map(([name, count]) => {
                      const matchedName = accountMatchPreview.get(name)
                      const isUnmatched = matchedName === null
                      return (
                        <div
                          key={name}
                          className={cn(
                            "flex items-center justify-between rounded-lg border px-4 py-3",
                            isUnmatched && "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{name}</p>
                            {matchedName && (
                              <p className="text-xs text-muted-foreground truncate">→ {matchedName}</p>
                            )}
                            {isUnmatched && (
                              <p className="text-xs text-amber-600 dark:text-amber-400">No matching account — {count} transactions will be skipped</p>
                            )}
                          </div>
                          <Badge variant={isUnmatched ? "outline" : "secondary"} className={cn("shrink-0", isUnmatched && "text-amber-600 border-amber-300")}>
                            {count} txns
                          </Badge>
                        </div>
                      )
                    })
                  })()}
                  <Alert>
                    <AlertCircle className="size-4" />
                    <AlertTitle>Dedup enabled</AlertTitle>
                    <AlertDescription>
                      Transactions matching existing records (same account, date, amount, and description) will be automatically skipped.
                    </AlertDescription>
                  </Alert>

              {/* Category Mode */}
              {categoryPreview.length > 0 && (
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Categories</p>
                    <p className="text-xs text-muted-foreground">
                      {categoryPreview.length} unique categories found in your file.
                    </p>
                  </div>

                  <div className="flex gap-1.5">
                    {([
                      { value: "map" as const, label: "Map to mine", icon: ArrowRightLeft },
                      { value: "keep" as const, label: "Keep original", icon: Tag },
                      { value: "skip" as const, label: "Skip categories", icon: Ban },
                    ]).map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCategoryMode(value)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                          categoryMode === value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        <Icon className="size-3" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {categoryMode === "map" && (
                    <div className="max-h-[240px] overflow-y-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">CSV Category</TableHead>
                            <TableHead className="text-xs">Maps To</TableHead>
                            <TableHead className="text-xs text-right w-16">Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categoryPreview.map(({ csvName, ourName, count }) => (
                            <TableRow key={csvName}>
                              <TableCell className="text-xs py-1.5">{csvName}</TableCell>
                              <TableCell className="text-xs py-1.5">
                                {ourName ? (
                                  <span>{ourName}</span>
                                ) : (
                                  <span className="text-muted-foreground italic">No match</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs py-1.5 text-right text-muted-foreground">{count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {categoryMode === "keep" && (
                    <p className="text-xs text-muted-foreground">
                      Categories from your CSV will be matched by exact name to your existing categories.
                      Unmatched categories will be left uncategorized.
                    </p>
                  )}

                  {categoryMode === "skip" && (
                    <p className="text-xs text-muted-foreground">
                      All transactions will be imported without categories. You can categorize them later.
                    </p>
                  )}
                </div>
              )}
                </div>
              ) : (
                <>
                  <Select
                    value={selectedAccountId}
                    onValueChange={setSelectedAccountId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">
                        + Create new account
                      </SelectItem>
                      {existingAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          <div className="flex items-center gap-2">
                            <AccountIcon
                              accountNumber={acc.name}
                              accountType={acc.account_type}
                              institutionName={acc.institution_name}
                              size="sm"
                              showNumber={true}
                            />
                            <span className="text-muted-foreground">
                              {acc.institution_name}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedAccountId === "new" && (
                    <div className="space-y-4 rounded-lg border p-4">
                      <p className="text-sm font-medium">New Account Details</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="acc-name">Account Name</Label>
                          <Input
                            id="acc-name"
                            placeholder="e.g. Chase Checking"
                            value={newAccountName}
                            onChange={(e) => setNewAccountName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="acc-institution">Institution</Label>
                          <Input
                            id="acc-institution"
                            placeholder="e.g. Chase"
                            value={newAccountInstitution}
                            onChange={(e) =>
                              setNewAccountInstitution(e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Account Type</Label>
                          <Select
                            value={newAccountType}
                            onValueChange={setNewAccountType}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ACCOUNT_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (fileType === "csv") {
                      setStep("mapping")
                    } else {
                      setStep("upload")
                      setFileType(null)
                    }
                  }}
                >
                  Back
                </Button>
                <Button onClick={handleImport} disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  Import {parsedTransactions.length} Transactions
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>
                First {Math.min(8, parsedTransactions.length)} transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {parsedTransactions.slice(0, 8).map((tx, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {tx.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {tx.date}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium ${
                        tx.amount < 0 ? "text-orange-600" : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
                {parsedTransactions.length > 8 && (
                  <p className="text-center text-[10px] text-muted-foreground pt-1">
                    +{parsedTransactions.length - 8} more transactions
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "importing" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="mb-4 size-10 animate-spin text-primary" />
            <p className="text-sm font-medium">
              {progressMessage || "Importing transactions…"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              This may take a moment for large files.
            </p>
            <div className="mt-6 w-full max-w-xs">
              <Progress value={importProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {step === "done" && importResult && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            {importResult.success ? (
              <>
                <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/50">
                  <CheckCircle2 className="size-7 text-emerald-600" />
                </div>
                <p className="text-lg font-semibold">Import Complete</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {importResult.message}
                </p>
                <div className="mt-6 flex gap-3">
                  <Button variant="outline" asChild>
                    <Link href="/transactions">View Transactions</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/accounts">
                      <FileUp className="size-4" />
                      Back to Accounts
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="size-7 text-destructive" />
                </div>
                <p className="text-lg font-semibold">Import Failed</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {importResult.message}
                </p>
                <div className="mt-6 flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep("upload")
                      setFileType(null)
                      setCsvData(null)
                      setParsedTransactions([])
                      setError(null)
                      setImportResult(null)
                      setImportProgress(0)
                      setImportPhase("idle")
                      setProgressMessage("")
                    }}
                  >
                    Try Again
                  </Button>
                  <Button asChild>
                    <Link href="/accounts">Back to Accounts</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
