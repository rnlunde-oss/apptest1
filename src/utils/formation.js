// Formation-based Damage Reduction system
// Position 0 = Front (Tank), 1 = Back-left, 2 = Back-right, 3 = Rear
// DR applies to ALL damage (physical, magic, AoE, DoT)

const POSITION_LABELS = ['Front', 'Back-Left', 'Back-Right', 'Rear'];

/**
 * Get the damage reduction fraction for a character at a given index in their group.
 * @param {Array} group - array of characters (party or enemies)
 * @param {number} index - position index of the defender
 * @returns {number} DR fraction 0.0–0.9
 */
export function getFormationDR(group, index) {
  if (index === 0) return 0; // Front: no DR

  if (index === 1 || index === 2) {
    // Back-left / Back-right: 25% if pos 0 alive, else 0%
    const front = group[0];
    return (front && front.hp > 0) ? 0.25 : 0;
  }

  if (index === 3) {
    // Rear: DR depends on how many of positions 0-2 are alive
    let aliveInFront = 0;
    for (let i = 0; i < 3 && i < group.length; i++) {
      if (group[i] && group[i].hp > 0) aliveInFront++;
    }
    if (aliveInFront >= 3) return 0.9;
    if (aliveInFront === 2) return 0.5;
    if (aliveInFront === 1) return 0.25;
    return 0;
  }

  return 0;
}

/**
 * Apply formation DR to raw damage, returning reduced damage (minimum 1).
 * @param {number} rawDamage
 * @param {Array} group - the defender's group
 * @param {number} defenderIndex - position index in the group
 * @returns {number} reduced damage (min 1)
 */
export function applyFormationDR(rawDamage, group, defenderIndex) {
  const dr = getFormationDR(group, defenderIndex);
  return Math.max(1, Math.floor(rawDamage * (1 - dr)));
}

/**
 * Get diamond/wedge formation positions for the party (left side of battlefield).
 * @param {number} count - number of party members (1-4)
 * @returns {Array<{x: number, y: number}>} positions
 */
export function getPartyFormationPositions(count) {
  // Diamond/wedge layout with front closest to enemies (right side)
  // Party is on the left, so front = higher x, rear = lower x
  const centerX = 180;
  const centerY = 380;

  if (count === 1) return [{ x: centerX, y: centerY }];
  if (count === 2) return [
    { x: centerX + 40, y: centerY },       // Front
    { x: centerX - 40, y: centerY },        // Back
  ];
  if (count === 3) return [
    { x: centerX + 40, y: centerY },        // Front
    { x: centerX - 30, y: centerY - 50 },   // Back-left
    { x: centerX - 30, y: centerY + 50 },   // Back-right
  ];
  // count >= 4: full diamond
  return [
    { x: centerX + 50, y: centerY },        // Front (closest to enemies)
    { x: centerX, y: centerY - 55 },        // Back-left
    { x: centerX, y: centerY + 55 },        // Back-right
    { x: centerX - 60, y: centerY },        // Rear (furthest from enemies)
  ];
}

/**
 * Get mirrored diamond formation positions for enemies (right side of battlefield).
 * @param {number} count - number of enemies (1-4)
 * @returns {Array<{x: number, y: number}>} positions
 */
export function getEnemyFormationPositions(count) {
  // Mirrored: front = lower x (closest to party), rear = higher x
  const centerX = 600;
  const centerY = 290;

  if (count === 1) return [{ x: centerX, y: centerY }];
  if (count === 2) return [
    { x: centerX - 40, y: centerY },       // Front
    { x: centerX + 40, y: centerY },        // Back
  ];
  if (count === 3) return [
    { x: centerX - 40, y: centerY },        // Front
    { x: centerX + 30, y: centerY - 50 },   // Back-left
    { x: centerX + 30, y: centerY + 50 },   // Back-right
  ];
  // count >= 4: full diamond
  return [
    { x: centerX - 50, y: centerY },        // Front (closest to party)
    { x: centerX, y: centerY - 55 },        // Back-left
    { x: centerX, y: centerY + 55 },        // Back-right
    { x: centerX + 60, y: centerY },        // Rear (furthest from party)
  ];
}

/**
 * Get the position label for a formation slot.
 * @param {number} index
 * @param {number} groupSize
 * @returns {string}
 */
export function getPositionLabel(index, groupSize) {
  if (groupSize === 1) return 'Front';
  if (groupSize === 2) {
    return index === 0 ? 'Front' : 'Back';
  }
  if (groupSize === 3) {
    return POSITION_LABELS[index] || 'Front';
  }
  return POSITION_LABELS[index] || 'Front';
}
