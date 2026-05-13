"use client"

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer'
import { FileText, Loader2 } from "lucide-react"

// Registrar fuentes si fuera necesario (opcional)
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#334155',
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  reportTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  meta: {
    textAlign: 'right',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 30,
  },
  summaryCard: {
    flex: 1,
    padding: 15,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    border: 1,
    borderColor: '#F1F5F9',
  },
  summaryLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  table: {
    width: 'auto',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    padding: 8,
    borderRadius: 4,
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cellCode: { width: '15%' },
  cellAccount: { width: '35%' },
  cellApproved: { width: '15%', textAlign: 'right' },
  cellConsumed: { width: '15%', textAlign: 'right' },
  cellExecution: { width: '20%', textAlign: 'right' },
  
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#94A3B8',
  }
});

type Allocation = {
  id: number
  amountUSD: number
  consumedUSD: number
  account?: { code?: string, name: string } | null
  companyAccount?: { globalAccount: { code: string, name: string } } | null
}

const MyDocument = ({ budget, allocations, stats }: { budget: any, allocations: Allocation[], stats: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.companyName}>{budget.branch.company.name}</Text>
          <Text style={styles.reportTitle}>Ejecución Presupuestaria: {budget.name}</Text>
          <Text style={{ fontSize: 8, marginTop: 2 }}>{budget.branch.name} | {new Date(budget.initialDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}</Text>
        </View>
        <View style={styles.meta}>
          <Text>Fecha de Generación:</Text>
          <Text style={{ fontWeight: 'bold' }}>{new Date().toLocaleString()}</Text>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Límite Total</Text>
          <Text style={styles.summaryValue}>${Number(stats.originalHardLimit).toLocaleString()}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Distribuido</Text>
          <Text style={styles.summaryValue}>${Number(stats.netAllocated).toLocaleString()}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Consumido</Text>
          <Text style={styles.summaryValue}>${Number(stats.totalConsumedUSD).toLocaleString()}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Disponibilidad</Text>
          <Text style={styles.summaryValue}>${Number(stats.availableToAllocate).toLocaleString()}</Text>
        </View>
      </View>

      {/* Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.cellCode]}>Código</Text>
          <Text style={[styles.tableHeaderCell, styles.cellAccount]}>Cuenta Contable</Text>
          <Text style={[styles.tableHeaderCell, styles.cellApproved]}>Aprobado</Text>
          <Text style={[styles.tableHeaderCell, styles.cellConsumed]}>Consumido</Text>
          <Text style={[styles.tableHeaderCell, styles.cellExecution]}>% Ejecu.</Text>
        </View>

        {allocations.map((alloc) => {
          const execution = Number(alloc.amountUSD) > 0 ? (Number(alloc.consumedUSD) / Number(alloc.amountUSD)) * 100 : 0;
          return (
            <View key={alloc.id} style={styles.tableRow}>
              <Text style={styles.cellCode}>{alloc.companyAccount?.globalAccount?.code || alloc.account?.code || 'S/C'}</Text>
              <Text style={styles.cellAccount}>{alloc.companyAccount?.globalAccount?.name || alloc.account?.name}</Text>
              <Text style={styles.cellApproved}>${Number(alloc.amountUSD).toLocaleString()}</Text>
              <Text style={styles.cellConsumed}>${Number(alloc.consumedUSD).toLocaleString()}</Text>
              <Text style={styles.cellExecution}>{execution.toFixed(1)}%</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.footer}>
        <Text>Reporte generado por Sistema de Gestión Presupuestaria</Text>
        <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </Text>
    </Page>
  </Document>
);

export function BudgetReportPDF({ budget, allocations, stats }: { budget: any, allocations: any[], stats: any }) {
  return (
    <PDFDownloadLink
      document={<MyDocument budget={budget} allocations={allocations} stats={stats} />}
      fileName={`Reporte_${budget.name.replace(/\s+/g, '_')}.pdf`}
      className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-xl shadow-indigo-500/20"
    >
      {({ loading }) => (
        <>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          {loading ? 'Generando...' : 'Descargar PDF'}
        </>
      )}
    </PDFDownloadLink>
  )
}
