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
 * Get diamond formation positions for the party (bottom-left of battlefield).
 * Diamond is angled so Front points upper-right toward the enemy team.
 * @param {number} count - number of party members (1-4)
 * @returns {Array<{x: number, y: number}>} positions
 */
export function getPartyFormationPositions(count) {
  const centerX = 190;
  const centerY = 380;

  if (count === 1) return [{ x: centerX, y: centerY }];
  if (count === 2) return [
    { x: centerX + 35, y: centerY - 30 },    // Front (upper-right, toward enemies)
    { x: centerX - 35, y: centerY + 30 },     // Back (lower-left)
  ];
  if (count === 3) return [
    { x: centerX + 40, y: centerY - 35 },     // Front (upper-right)
    { x: centerX - 40, y: centerY - 20 },     // Back-left (upper-left)
    { x: centerX + 10, y: centerY + 40 },     // Back-right (lower-right)
  ];
  // count >= 4: full diamond angled toward upper-right
  return [
    { x: centerX + 50, y: centerY - 40 },     // Front (upper-right, closest to enemies)
    { x: centerX - 20, y: centerY - 40 },     // Back-left (upper-left wing)
    { x: centerX + 50, y: centerY + 30 },     // Back-right (lower-right wing)
    { x: centerX - 20, y: centerY + 30 },     // Rear (lower-left, furthest from enemies)
  ];
}

/**
 * Get diamond formation positions for enemies (top-right of battlefield).
 * Diamond is angled so Front points lower-left toward the player team.
 * @param {number} count - number of enemies (1-4)
 * @returns {Array<{x: number, y: number}>} positions
 */
export function getEnemyFormationPositions(count) {
  const centerX = 580;
  const centerY = 280;

  if (count === 1) return [{ x: centerX, y: centerY }];
  if (count === 2) return [
    { x: centerX - 35, y: centerY + 30 },     // Front (lower-left, toward party)
    { x: centerX + 35, y: centerY - 30 },      // Back (upper-right)
  ];
  if (count === 3) return [
    { x: centerX - 40, y: centerY + 35 },      // Front (lower-left)
    { x: centerX - 10, y: centerY - 40 },      // Back-left (upper-left)
    { x: centerX + 40, y: centerY + 20 },      // Back-right (lower-right)
  ];
  // count >= 4: full diamond angled toward lower-left
  return [
    { x: centerX - 50, y: centerY + 40 },      // Front (lower-left, closest to party)
    { x: centerX - 50, y: centerY - 30 },      // Back-left (upper-left wing)
    { x: centerX + 20, y: centerY + 40 },      // Back-right (lower-right wing)
    { x: centerX + 20, y: centerY - 30 },      // Rear (upper-right, furthest from party)
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
