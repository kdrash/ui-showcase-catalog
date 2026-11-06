export function ArtNouveauInvite() {
  return (
    <div className="@container relative isolate grid h-full w-full place-items-center overflow-y-auto bg-[#202b25] p-4 @md:p-7">
      <article className="relative isolate grid min-h-full w-full max-w-4xl place-items-center overflow-hidden border border-[#a98956] bg-[#e9d7af] p-5 text-center text-[#3a4736] shadow-[0_20px_80px_#151b16] @md:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-2 -z-10 border border-[#9e734f]/65" />
        <svg aria-hidden="true" viewBox="0 0 720 420" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 -z-10 h-full w-full">
          {[false, true].map((flipped) => (
            <g key={String(flipped)} transform={flipped ? 'translate(720 0) scale(-1 1)' : undefined}>
              <path d="M24 382C175 322 24 253 75 154 98 108 155 86 199 30M24 381C76 372 141 361 161 294 172 250 143 211 116 204M74 158C44 132 49 96 70 60M74 158C104 147 117 137 126 114" fill="none" stroke="#78825d" strokeWidth="2.3" />
              <path d="M85 245C26 230 24 201 19 178 57 181 82 204 85 245ZM79 316C111 268 139 286 153 277 148 310 115 327 79 316ZM86 147C77 96 102 80 116 59 123 96 116 130 86 147ZM130 104C133 60 157 56 176 43 174 72 158 95 130 104Z" fill="#8b9169" opacity=".78" />
              <path d="M69 63C45 58 35 43 43 27 55 30 63 35 68 44 69 28 76 20 83 16 99 37 90 53 69 63ZM115 207C93 211 78 199 79 183 95 181 106 187 114 196 118 180 129 172 143 171 149 187 135 202 115 207Z" fill="#b86e56" />
              <path d="M24 382C60 393 87 393 119 382M24 382C20 331 20 302 24 272" fill="none" stroke="#a98354" strokeWidth="2" />
            </g>
          ))}
          <path d="M255 49C298 49 325 20 360 20s62 29 105 29M255 371c43 0 70 29 105 29s62-29 105-29" fill="none" stroke="#a98354" strokeWidth="1.25" />
        </svg>
        <div className="relative grid max-w-[71%] justify-items-center">
          <p className="text-[9px] font-semibold tracking-[.24em] @md:text-xs">L'ATELIER BOTANIQUE</p>
          <p aria-hidden="true" className="my-2 font-serif text-xl text-[#9e644f]">❦</p>
          <h2 className="font-serif text-[clamp(1.85rem,8.5cqw,7rem)] leading-[.8] tracking-[-.055em] italic">Jardin<br />de Nuit</h2>
          <p className="mt-5 border-y border-[#9e734f]/60 px-3 py-2 font-serif text-[11px] tracking-widest @md:text-sm">夜の庭への招待状</p>
          <p className="mt-3 font-serif text-[10px] tracking-[.13em] @md:text-xs">18 SEPT 2027 · 19H30<br />PAVILLON DES SERRES</p>
        </div>
      </article>
    </div>
  )
}
