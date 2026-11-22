import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://agkfqisstohftsumgvmv.supabase.co'

const supabaseKey = 'sb_publishable_wkPxf5lHTnbQYHy7PJs3NQ_NFkw2MVE'

export const supabase = createClient(supabaseUrl, supabaseKey)
