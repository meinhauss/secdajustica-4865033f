INSERT INTO public.outorga_regras (outorgante, cargo) VALUES
  ('procurador_geral', 'procurador_geral_adjunto'),
  ('procurador_geral_adjunto', 'analista')
ON CONFLICT DO NOTHING;