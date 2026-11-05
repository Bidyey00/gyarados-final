
const bannedWords = [
  // FILIPINO BAD WORDS
  'putangina', 'putang ina', 'putanginamo',
  'tangina', 'tanginamo', 'taena', 'tangna',
  'pota', 'puta', 'pucha', 'punyeta',
  'leche', 'letse', 'lintik',
  'gago', 'gaga', 'gagi', 'ogag',
  'ulol', 'ulul', 'bobo', 'tanga',
  'tarantado', 'tarantada',
  'pakyu', 'pakyew', 'kingina',
  'kinangina', 'bwisit', 'buwisit',
  'hinayupak', 'kupal', 'pakshet',
  'paksheyt', 'shuta', 'shutangina',
  'yawa', 'pestengyawa', 'titi', 'borat',
  'pekpek', 'kantot', 'kantutan',
  'jakol', 'jabol', 'burat', 'bilat',
  'libog', 'tite', 'titi', 'titiin', 'titein', 
  'finger', 'fingering', 'fingeringin', 'fingeringan',
  'suso', 'susoan', 'susoan mo', 'suso mo', 'suso ko',
  'hayop', 'hayup', 'hayup ka', 'hayup mo', 'hayup ko',
  'bastos', 'bastard', 'bastard ka', 'bastard mo', 'bastard ko',
  'malandi', 'malandi ka', 'malandi mo', 'malandi ko',
  'malibog', 'malibog ka', 'malibog mo', 'malibog ko',

  // ENGLISH BAD WORDS
  'fuck', 'fucking', 'fucker',
  'motherfucker', 'motherfucking',
  'fck', 'fuk', 'fuq',
  'shit', 'shitty', 'bullshit',
  'bitch', 'bitches', 'biatch',
  'asshole', 'arsehole', 'asshat',
  'jackass', 'dumbass', 'bastard',
  'damn', 'dammit', 'goddamn',
  'crap', 'piss', 'prick',
  'dickhead', 'dick', 'cock',
  'cunt', 'twat', 'wanker',
  'douche', 'douchebag',
  'scumbag', 'dipshit', 'shithead',
  'nigga', 'nigger', 'nigguh', 'niggah',
  'slut', 'fuckshit', 'fuckme',

  // INSULTS
  'idiot', 'moron', 'imbecile',
  'stupid', 'dumb', 'loser',
  'retard', 'retarded',
  'worthless', 'pathetic',
  'pervert',

  // EXPLICIT TERMS
  'porn', 'porno', 'hentai',
  'masturbate', 'masturbation',
  'blowjob', 'handjob',
  'pussy', 'kantot', 'kantutan',
  'jakol', 'jabol', 'burat',
  'bilat', 'pekpek', 'libog',
  'jabol'
];

// Convert disguised characters into letters
const characterMap = {
  '@': 'a',
  '4': 'a',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '0': 'o',
  '$': 's',
  '5': 's',
  '7': 't',
  '+': 't',
  '8': 'b',
  '9': 'g',
};

// Normalize words to detect bypass attempts
function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKC')
    .split('')
    .map(char => characterMap[char] || char)
    .join('')
    .replace(/[^a-z0-9]/g, '')
    .replace(/([a-z])\1+/g, '$1');
}

// Check for banned words
export function containsBadWords(text) {
  const cleaned = normalizeText(text);

  return bannedWords.some(word => {
    const normalizedWord = normalizeText(word);
    return cleaned.includes(normalizedWord);
  });
}

// Validate all registration fields
export function validateRegistration(name, email, password) {
  const errors = [];

  // FULL NAME
  if (containsBadWords(name)) {
    errors.push(
      'Your name contains inappropriate language.'
    );
  }

  // EMAIL
  const emailUsername = String(email).split('@')[0];

  if (containsBadWords(emailUsername)) {
    errors.push(
      'Your email contains inappropriate language.'
    );
  }

  // PASSWORD
  if (containsBadWords(password)) {
    errors.push(
      'Your password contains inappropriate language.'
    );
  }

  // Prevent account creation
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return true;
}
