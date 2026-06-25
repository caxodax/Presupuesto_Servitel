"use server"

import { getDashboardKpis as kpis, getExecutiveAnalytics as analytics, getRecentActivity as activity } from "./queries"

export async function getDashboardKpis(searchParams: { companyId?: number; branchId?: number; budgetId?: number; groupId?: number }) {
    return kpis(searchParams)
}

export async function getExecutiveAnalytics(searchParams: { companyId?: number; branchId?: number; budgetId?: number; groupId?: number }) {
    return analytics(searchParams)
}

export async function getRecentActivity(searchParams: { companyId?: number; branchId?: number; budgetId?: number; groupId?: number }) {
    return activity(searchParams)
}
