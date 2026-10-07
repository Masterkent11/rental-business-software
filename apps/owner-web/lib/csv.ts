export function downloadCsv(fileName: string, rows: readonly (readonly (string | number | null)[])[]) {
  const escape = (value: string | number | null) => {
    const text = value === null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const blob = new Blob([rows.map((row) => row.map(escape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
