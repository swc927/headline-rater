/* Neon Headline Rater script */
;(() => {
  const $ = (sel) => document.querySelector(sel)
  const $$ = (sel) => Array.from(document.querySelectorAll(sel))

  const els = {
    inA: $('#inputA'),
    inB: $('#inputB'),
    scoreA: $('#scoreA'),
    scoreB: $('#scoreB'),
    gaugeA: $('#gaugeA'),
    gaugeB: $('#gaugeB'),
    metaA: $('#metaA'),
    metaB: $('#metaB'),
    tipsA: $('#tipsA'),
    tipsB: $('#tipsB'),
    compare: $('#compare'),
    copyBest: $('#copyBest'),
    clear: $('#clear'),
    share: $('#share'),
    swap: $('#swap'),
    stars: $('#stars'),
  }

  const POWER_WORDS = [
    "proven","secret","free","instant","simple","quick","new","ultimate",
    "exclusive","limited","now","easy","guaranteed","surprising","powerful","unveiled",
    "best","breakthrough","save","win","boost"
  ]
  const POSITIVE = ["amazing","awesome","best","brilliant","delight","easy","epic","excellent","great","love","perfect","proven","quick","simple","win","boost"]
  const NEGATIVE = ["bad","boring","confusing","hard","hate","slow","terrible","worse","worst","scam","spam"]

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n))
  const wordList = (s) => s.toLowerCase().match(/[a-z0-9']+/g) || []
  const hasNumber = (s) => /\d/.test(s)
  const hasBrackets = (s) => /[\[\(\{].*[\]\)\}]/.test(s)

  function scoreHeadline(str){
    const words = wordList(str)
    const chars = str.trim().length
    const wc = words.length

    // Base from length sweet spots
    let lengthScore = 0
    // words target 6 to 12, chars target 30 to 60
    const wordTarget = wc >= 6 && wc <= 12 ? 100 : 100 - Math.abs(9 - wc) * 10
    const charTarget = chars >= 30 && chars <= 60 ? 100 : 100 - Math.abs(45 - chars) * 2.2
    lengthScore = clamp((wordTarget * 0.6 + charTarget * 0.4), 0, 100)

    // Power words bonus limited
    const powerHits = words.filter(w => POWER_WORDS.includes(w)).length
    const powerScore = clamp(powerHits * 10, 0, 30)

    // Sentiment rough
    let senti = 50
    words.forEach(w => {
      if(POSITIVE.includes(w)) senti += 3
      if(NEGATIVE.includes(w)) senti -= 4
    })
    const sentimentScore = clamp(senti, 0, 100) * 0.2

    // Readability proxy, shorter words and fewer stop symbols
    const avgLen = wc ? words.reduce((a,w)=>a+w.length,0) / wc : 0
    const punctuation = (str.match(/[!?.,:;]/g) || []).length
    let readability = 100 - (avgLen - 4) * 12 - punctuation * 3
    readability = clamp(readability, 0, 100) * 0.25

    // Diversity penalty for repeated bigrams
    const bigrams = new Map()
    for(let i=0;i<words.length-1;i++){
      const bg = words[i] + " " + words[i+1]
      bigrams.set(bg, (bigrams.get(bg) || 0) + 1)
    }
    let repetitionPenalty = 0
    bigrams.forEach(c => { if(c>1) repetitionPenalty += (c-1)*8 })
    repetitionPenalty = clamp(repetitionPenalty, 0, 30)

    // Structural bonuses
    const numberBonus = hasNumber(str) ? 8 : 0
    const bracketBonus = hasBrackets(str) ? 5 : 0
    const caseBonus = /^[A-Z][^A-Z]*$/.test(str.trim()) ? 2 : 0 // starts with capital, not shouty

    let raw = lengthScore * 0.45 + powerScore + sentimentScore + readability + numberBonus + bracketBonus + caseBonus
    raw -= repetitionPenalty

    const score = Math.round(clamp(raw, 0, 100))

    // Tips assemble
    const tips = []
    tips.push(`${wc} words, ${chars} chars`)
    if(wc < 6) tips.push("Try a few more words")
    if(wc > 12) tips.push("Trim the sentence")
    if(chars < 30) tips.push("Add context or a benefit")
    if(chars > 60) tips.push("Cut filler words")
    if(!hasNumber(str)) tips.push("Add a number to anchor value")
    if(!hasBrackets(str)) tips.push("Consider brackets for extra detail")
    if(powerHits === 0) tips.push("Try one power word")
    if(avgLen > 6) tips.push("Prefer shorter words")
    if((str.match(/[A-Z]{4,}/) || []).length) tips.push("Avoid shouting")
    if(repetitionPenalty > 0) tips.push("Avoid repetition")

    return { score, wc, chars, tips: [...new Set(tips)].slice(0,6) }
  }

  function updateSide(which){
    const input = which === 'A' ? els.inA.value : els.inB.value
    const res = scoreHeadline(input)
    const scoreEl = which === 'A' ? els.scoreA : els.scoreB
    const gauge = which === 'A' ? els.gaugeA : els.gaugeB
    const meta = which === 'A' ? els.metaA : els.metaB
    const tips = which === 'A' ? els.tipsA : els.tipsB

    scoreEl.textContent = String(res.score)
    gauge.style.setProperty('--pct', res.score)
    meta.textContent = `${res.wc} words, ${res.chars} chars`
    tips.innerHTML = res.tips.map(t => `<li>${t}</li>`).join('')
    return res.score
  }

  function compare(){
    const a = updateSide('A')
    const b = updateSide('B')
    const best = a === b ? null : a > b ? 'A' : 'B'
    ;['gaugeA','gaugeB'].forEach(id => document.getElementById(id).classList.remove('win'))
    if(best){
      const id = best === 'A' ? 'gaugeA' : 'gaugeB'
      document.getElementById(id).classList.add('win')
      burst(best === 'A' ? els.gaugeA : els.gaugeB)
    }
  }

  function burst(target){
    // simple sparkle burst on win
    const rect = target.getBoundingClientRect()
    const cx = rect.left + rect.width/2
    const cy = rect.top + rect.height/2
    for(let i=0;i<16;i++){
      const s = document.createElement('span')
      s.className = 'spark'
      s.style.left = cx + 'px'
      s.style.top = cy + 'px'
      s.style.setProperty('--dx', (Math.random()*2-1)*160 + 'px')
      s.style.setProperty('--dy', (Math.random()*2-1)*160 + 'px')
      s.style.setProperty('--rot', (Math.random()*720-360) + 'deg')
      document.body.appendChild(s)
      setTimeout(()=>s.remove(), 600)
    }
  }

  function save(){
    const data = { a: els.inA.value, b: els.inB.value }
    localStorage.setItem('neon-headline-rater', JSON.stringify(data))
  }
  function load(){
    try{
      const q = new URLSearchParams(location.search)
      const a = q.get('a'), b = q.get('b')
      const saved = JSON.parse(localStorage.getItem('neon-headline-rater') || '{}')
      if(a !== null || b !== null){
        if(a !== null) els.inA.value = decodeURIComponent(a)
        if(b !== null) els.inB.value = decodeURIComponent(b)
      } else {
        els.inA.value = saved.a || ''
        els.inB.value = saved.b || ''
      }
    }catch{}
    updateSide('A'); updateSide('B')
  }

  function copyWinner(){
    const a = updateSide('A')
    const b = updateSide('B')
    const text = a >= b ? els.inA.value : els.inB.value
    if(!text.trim()) return
    navigator.clipboard.writeText(text).then(()=>{
      ripple(els.copyBest)
    })
  }
  function shareLink(){
    const a = encodeURIComponent(els.inA.value)
    const b = encodeURIComponent(els.inB.value)
    const url = `${location.origin}${location.pathname}?a=${a}&b=${b}`
    navigator.clipboard.writeText(url).then(()=>ripple(els.share))
  }
  function ripple(btn){
    btn.style.transform = 'scale(0.98)'
    setTimeout(()=>btn.style.transform = '',120)
  }
  function clearAll(){
    els.inA.value=''; els.inB.value=''; save(); updateSide('A'); updateSide('B')
  }
  function swap(){
    const a = els.inA.value
    els.inA.value = els.inB.value
    els.inB.value = a
    updateSide('A'); updateSide('B'); save()
  }

  // parallax stars
  const ctx = els.stars.getContext('2d')
  let stars = []
  function initStars(){
    const w = els.stars.width = innerWidth
    const h = els.stars.height = innerHeight
    stars = Array.from({length:120}, () => ({
      x: Math.random()*w, y: Math.random()*h, r: Math.random()*1.4+0.3, s: Math.random()*0.4+0.1
    }))
  }
  function drawStars(){
    const w = els.stars.width, h = els.stars.height
    ctx.clearRect(0,0,w,h)
    stars.forEach(st => {
      ctx.beginPath()
      ctx.arc(st.x, st.y, st.r, 0, Math.PI*2)
      ctx.fillStyle = 'rgba(124,240,255,0.6)'
      ctx.fill()
      st.x += st.s * 0.2
      if(st.x > w) st.x = 0
    })
    requestAnimationFrame(drawStars)
  }
  addEventListener('resize', initStars)

  // events
  ;['input','change','blur','keyup'].forEach(ev => {
    els.inA.addEventListener(ev, () => { updateSide('A'); save() })
    els.inB.addEventListener(ev, () => { updateSide('B'); save() })
  })
  els.compare.addEventListener('click', compare)
  els.copyBest.addEventListener('click', copyWinner)
  els.clear.addEventListener('click', clearAll)
  els.share.addEventListener('click', shareLink)
  els.swap.addEventListener('click', swap)

  document.addEventListener('keydown', e => {
    const meta = e.metaKey || e.ctrlKey
    if(meta && e.key === 'Enter'){ e.preventDefault(); compare() }
    if(meta && e.key === '1'){ e.preventDefault(); els.inA.focus() }
    if(meta && e.key === '2'){ e.preventDefault(); els.inB.focus() }
    if(e.key === 'Escape'){ clearAll() }
  })

  // winner glow style
  const style = document.createElement('style')
  style.textContent = `.win{ box-shadow: 0 0 0 3px rgba(93,216,255,0.35), 0 0 40px rgba(166,120,255,0.35) } 
  .spark{ position:fixed; width:6px; height:6px; background:linear-gradient(90deg,#5dd8ff,#a678ff); border-radius:999px;
    left:0; top:0; transform: translate(-50%,-50%) rotate(var(--rot)); animation: fly .6s ease forwards }
  @keyframes fly{ to{ transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--rot)); opacity:0 } }`
  document.head.appendChild(style)

  // start
  initStars()
  drawStars()
  load()
})()
