export function generateSections() {
  const sections = [];
  const years = [1, 2, 3, 4, 5];
  const semesters = [1, 2];
  const slots = ["M", "A", "E"];
  const nums = [1, 2];

  for (const year of years) {
    for (const sem of semesters) {
      for (const slot of slots) {
        for (const num of nums) {
          sections.push(`${year}${sem}${slot}${num}`);
        }
      }
    }
  }

  return sections;
}

export function parseSectionLabel(code) {
  if (!code || code.length < 4) return code;
  const year = code[0];
  const sem = code[1];
  const slotMap = { M: "Morning", A: "Afternoon", E: "Evening" };
  const slot = slotMap[code[2]] || code[2];
  const num = code[3];
  return `${code} — Year ${year}, Sem ${sem}, ${slot}, Sec ${num}`;
}
