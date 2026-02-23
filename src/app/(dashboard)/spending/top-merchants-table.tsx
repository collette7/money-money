"use client"

import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Merchant {
  merchant_name: string
  total: number
  count: number
}

interface TopMerchantsTableProps {
  merchants: Merchant[]
}

export function TopMerchantsTable({ merchants }: TopMerchantsTableProps) {
  const router = useRouter()

  const handleMerchantClick = (merchantName: string) => {
    const params = new URLSearchParams()
    params.set("search", merchantName)
    router.push(`/transactions?${params.toString()}`)
  }

  if (merchants.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No merchant data available
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[70%]">Merchant</TableHead>
          <TableHead className="w-[15%] text-right">Transactions</TableHead>
          <TableHead className="w-[15%] text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {merchants.map((m, i) => (
          <TableRow 
            key={m.merchant_name}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleMerchantClick(m.merchant_name)}
          >
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-[10px] font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <span className="font-medium" title={m.merchant_name}>
                  {m.merchant_name}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {m.count}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD"
              }).format(m.total)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}