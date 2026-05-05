import { createClient } from "../src/lib/supabase/server"

async function debug() {
    const supabase = await createClient()
    const { data: budget } = await supabase.from('Budget').select('companyId').eq('id', 3).single()
    console.log('Budget 3 CompanyId:', budget?.companyId)
    
    if (budget) {
        const { data: categories } = await supabase.from('Category').select('*').eq('companyId', budget.companyId)
        console.log('Categories for company:', categories)
    }
}

debug()
