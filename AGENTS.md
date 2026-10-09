# Architecture rules
- Triagem Penal cards, clipboard and PDF use one shared structured-result formatter so escaping and field labels remain consistent across outputs.
- Triagem Penal results use a dedicated presentation component with decision summaries and expandable reasoning, keeping visual changes separate from analysis and export logic.
- Triagem Penal PDF prose is composed deterministically from existing results through the shared formatter; absent legal grounds are explicitly flagged rather than invented.