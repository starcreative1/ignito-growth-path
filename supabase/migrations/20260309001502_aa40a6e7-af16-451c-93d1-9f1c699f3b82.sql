-- Add stripe account id to mentor profiles for Stripe Connect if it doesn't exist
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS stripe_account_id text;

-- Create ai_content_requests table
CREATE TABLE public.ai_content_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    learner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mentor_id uuid NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
    avatar_id uuid NOT NULL REFERENCES public.mentor_avatars(id) ON DELETE CASCADE,
    topic text NOT NULL,
    format text NOT NULL,
    instructions text,
    price numeric NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    stripe_payment_intent_id text,
    stripe_transfer_id text,
    generated_video_url text,
    generated_script text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Note: We omit CHECK constraint as instructed in some projects, we use validation logic in the frontend/backend

-- Enable RLS
ALTER TABLE public.ai_content_requests ENABLE ROW LEVEL SECURITY;

-- Policies for learners
CREATE POLICY "Learners can view their own requests"
ON public.ai_content_requests FOR SELECT
TO authenticated
USING (auth.uid() = learner_id);

CREATE POLICY "Learners can create requests"
ON public.ai_content_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Learners can update their own requests"
ON public.ai_content_requests FOR UPDATE
TO authenticated
USING (auth.uid() = learner_id)
WITH CHECK (auth.uid() = learner_id);

-- Policies for mentors
CREATE POLICY "Mentors can view requests sent to them"
ON public.ai_content_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mentor_profiles
    WHERE mentor_profiles.id = ai_content_requests.mentor_id
    AND mentor_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Mentors can update requests sent to them"
ON public.ai_content_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mentor_profiles
    WHERE mentor_profiles.id = ai_content_requests.mentor_id
    AND mentor_profiles.user_id = auth.uid()
  )
);

-- Update timestamp trigger
CREATE TRIGGER update_ai_content_requests_updated_at
BEFORE UPDATE ON public.ai_content_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();