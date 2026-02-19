-- LaunchKit Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'ar')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores table
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  platform TEXT DEFAULT 'zid' CHECK (platform IN ('zid', 'salla', 'shopify')),
  access_token TEXT NOT NULL,
  auth_token TEXT,          -- Zid's separate "authorization" bearer token
  refresh_token TEXT,
  store_name TEXT NOT NULL,
  store_id TEXT,
  theme_id TEXT,            -- Selected theme preset id (e.g. "desert-gold")
  logo_url TEXT,            -- SVG data URI or AI-generated image URL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: add missing columns to existing stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS auth_token TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS theme_id TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Setup sessions table
CREATE TABLE IF NOT EXISTS public.setup_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  current_step TEXT DEFAULT 'business' CHECK (current_step IN ('business', 'categories', 'products', 'marketing')),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table (chat history)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.setup_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.setup_sessions(id) ON DELETE CASCADE NOT NULL,
  platform_id TEXT,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.setup_sessions(id) ON DELETE CASCADE NOT NULL,
  platform_id TEXT,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  variants JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setup_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own stores" ON public.stores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stores" ON public.stores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stores" ON public.stores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own stores" ON public.stores FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" ON public.setup_sessions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = setup_sessions.store_id AND stores.user_id = auth.uid()));
CREATE POLICY "Users can insert own sessions" ON public.setup_sessions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = setup_sessions.store_id AND stores.user_id = auth.uid()));
CREATE POLICY "Users can update own sessions" ON public.setup_sessions
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = setup_sessions.store_id AND stores.user_id = auth.uid()));

CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.setup_sessions s
    JOIN public.stores st ON st.id = s.store_id
    WHERE s.id = messages.session_id AND st.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own messages" ON public.messages
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.setup_sessions s
    JOIN public.stores st ON st.id = s.store_id
    WHERE s.id = messages.session_id AND st.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own categories" ON public.categories
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.setup_sessions s
    JOIN public.stores st ON st.id = s.store_id
    WHERE s.id = categories.session_id AND st.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own categories" ON public.categories
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.setup_sessions s
    JOIN public.stores st ON st.id = s.store_id
    WHERE s.id = categories.session_id AND st.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own products" ON public.products
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.setup_sessions s
    JOIN public.stores st ON st.id = s.store_id
    WHERE s.id = products.session_id AND st.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own products" ON public.products
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.setup_sessions s
    JOIN public.stores st ON st.id = s.store_id
    WHERE s.id = products.session_id AND st.user_id = auth.uid()
  ));

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.setup_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
