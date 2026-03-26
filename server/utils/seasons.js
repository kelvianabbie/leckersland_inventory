function getSeason(date) {
  const month = date.getMonth() + 1; // JS months 0-11
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

module.exports = { getSeason };