@echo off
echo Creazione dello schema public
psql -h YOUR_SUPABASE_HOST -U YOUR_SUPABASE_USER -d YOUR_SUPABASE_DB -c "CREATE SCHEMA IF NOT EXISTS public;"

echo Creazione della tabella users
psql -h YOUR_SUPABASE_HOST -U YOUR_SUPABASE_USER -d YOUR_SUPABASE_DB -c "
    CREATE TABLE IF NOT EXISTS public.users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );"

echo Creazione della tabella documents
psql -h YOUR_SUPABASE_HOST -U YOUR_SUPABASE_USER -d YOUR_SUPABASE_DB -c "
    CREATE TABLE IF NOT EXISTS public.documents (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID REFERENCES public.users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );"

echo Creazione della tabella courses
psql -h YOUR_SUPABASE_HOST -U YOUR_SUPABASE_USER -d YOUR_SUPABASE_DB -c "
    CREATE TABLE IF NOT EXISTS public.courses (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );"

echo Creazione delle policy RLS
psql -h YOUR_SUPABASE_HOST -U YOUR_SUPABASE_USER -d YOUR_SUPABASE_DB -c "
    CREATE POLICY \"Enable read access for all users\" ON public.users FOR SELECT TO public USING (true);
    CREATE POLICY \"Enable read access for all users\" ON public.documents FOR SELECT TO public USING (true);
    CREATE POLICY \"Enable read access for all users\" ON public.courses FOR SELECT TO public USING (true);"

echo Installazione delle estensioni necessarie
psql -h YOUR_SUPABASE_HOST -U YOUR_SUPABASE_USER -d YOUR_SUPABASE_DB -c "
    CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
    CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
