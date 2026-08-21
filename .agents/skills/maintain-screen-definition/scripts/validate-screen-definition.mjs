import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '../../../..');
const documentPath = join(projectRoot, 'docs/screen-definition.md');
const appPath = join(projectRoot, 'app');
const errors = [];

if (!existsSync(documentPath)) {
  console.error('FAIL: docs/screen-definition.md 파일이 없습니다.');
  process.exit(1);
}

const document = readFileSync(documentPath, 'utf8');
const requiredHeadings = [
  '# 노크 통합 기획 및 화면정의서',
  '## 4. 공통 화면 정의',
  '## 5. 고객 화면 정의',
  '## 6. 업체 담당자 화면 정의',
  '## 7. 관리자 화면 정의',
  '## 9. 화면 변경 관리 절차',
  '## 10. 변경 이력',
];

for (const heading of requiredHeadings) {
  if (!document.includes(heading)) {
    errors.push(`필수 제목 누락: ${heading}`);
  }
}

const screenIds = [...document.matchAll(/^### ((?:COM|CUS|PAR|ADM)-\d{3})\b/gm)].map(
  (match) => match[1],
);
const duplicateIds = screenIds.filter((id, index) => screenIds.indexOf(id) !== index);

for (const id of new Set(duplicateIds)) {
  errors.push(`중복 화면 ID: ${id}`);
}

const collectScreenFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return collectScreenFiles(fullPath);
    if (!entry.name.endsWith('.tsx') || entry.name === '_layout.tsx') return [];
    return [relative(projectRoot, fullPath)];
  });

for (const screenFile of collectScreenFiles(appPath)) {
  if (!document.includes(`\`${screenFile}\``)) {
    errors.push(`화면정의서에서 구현 파일을 찾을 수 없음: ${screenFile}`);
  }
}

if (errors.length > 0) {
  console.error('화면정의서 검증 실패');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `화면정의서 검증 통과: 화면 ID ${screenIds.length}개, 구현 화면 파일 ${collectScreenFiles(appPath).length}개`,
);
