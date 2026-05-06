export function detectEmotion(text: string): string {
  const t = text.toLowerCase();
  // Excited: वाह, अद्भुत, कमाल, बेहतरीन, जबरदस्त, शानदार
  if (/\b(wow|amazing|incredible|fantastic|wonderful|love|joy|hugs|hug|wah|adbhut|kamaal|behtareen|zabardast|shaandaar)\b|!{2,}|(वाह|अद्भुत|कमाल|बेहतरीन|जबरदस्त|शानदार)/.test(t) || /\*(hugs?|smiles?|laughs?|grins?)\*/.test(t)) return 'excited';
  // Happy: खुश, अच्छा, बढ़िया, प्रसन्न, आनंद
  if (/\b(happy|glad|great|good|excellent|awesome|smile|khush|achha|badhiya|prasann|aanand)\b|(खुश|अच्छा|बढ़िया|प्रसन्न|आनंद)/.test(t)) return 'happy';
  // Sad: दुखी, उदास, क्षमा, माफ़, अफ़सोस, दर्द
  if (/\b(sad|sorry|miss|lost|grief|cry|difficult|hard|tears|dukhi|udaas|kshama|maaf|afsos|dard)\b|(दुखी|उदाश|क्षमा|माफ़|अफ़सोस|दर्द)/.test(t) || /\*(cries|sighs|frowns)\*/.test(t)) return 'sad';
  // Thinking: सोच, शायद, विचार
  if (/\b(hmm|think|wonder|consider|maybe|perhaps|well|soch|shayad|vichaar)\b|\?|(सोच|शायद|विचार)/.test(t) || /\*(thinks|ponders)\*/.test(t)) return 'thinking';
  // Surprised: अरे, क्या, सचमुच, गजब
  if (/\b(oh|wow|whoa|really|seriously|what|unbelievable|arey|kya|sachmuch|gajab)\b|(अरे|क्या|सचमुच|गजब)/.test(t) || /\*(gasps|surprised)\*/.test(t)) return 'surprised';
  return 'neutral';
}

export function cleanText(text: string): string {
  let cleaned = text.replace(/\*[^*]+\*/g, ''); // Remove actions like *hugs* or *smiles*
  cleaned = cleaned.replace(/\([^)]+\)/g, ''); // Remove actions like (hugs) or (smiles)
  cleaned = cleaned.replace(/\[[^\]]+\]/g, ''); // Remove [smiles]
  cleaned = cleaned.replace(/[*_~`#^]/g, ''); // Remove any remaining Markdown formatting
  
  // Bypass TS compiler check for 'u' flag by using RegExp constructor
  const emojiRegex = new RegExp('[\\p{Emoji_Presentation}\\p{Extended_Pictographic}]', 'gu');
  cleaned = cleaned.replace(emojiRegex, ''); // Remove emojis
  
  return cleaned.trim();
}
