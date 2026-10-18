<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Layout archive imports merge presentation into existing routes; existing persistence, access controls, validation, and export code remain authoritative to avoid replacing live capabilities.
- Shared delete dialogs and dismissal hooks handle presentation only; caller-owned persistence remains authoritative so visual imports cannot swap data access.
