# Architecture rules
- Institutional competition controls (DPG → Defensor Público, Desembargador → Analista Judiciário) use a role-and-career permission check mirrored by database policies, so chiefs never manage competitions of other careers.
- Dashboard URL section keys are normalized for diacritics before validation, so accented links resolve to the existing canonical section without duplicating pages.
- Triagem Penal cards, clipboard and PDF use one shared structured-result formatter so escaping and field labels remain consistent across outputs.
- Triagem Penal results use a dedicated presentation component with decision summaries and expandable reasoning, keeping visual changes separate from analysis and export logic.
- Triagem Penal PDF prose is composed deterministically from existing results through the shared formatter; absent legal grounds are explicitly flagged rather than invented.
- Triagem Penal PDF exports require the current authenticated profile as signer and the system branding asset; the signature is identification, not a certified cryptographic signature.- Corregedoria rules: chief permission resolved server-side by orgao_do_membro/pode_corregedoria, so the reported member's real roles decide routing, never client input.
