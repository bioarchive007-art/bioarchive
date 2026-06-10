import { Suspense } from 'react';
import CourseDetail from '@/components/CourseDetail';
import { CURRICULUM } from '@/data/curriculum';

export function generateStaticParams() {
  const codes: string[] = [];
  Object.values(CURRICULUM).forEach((courses) => {
    courses.forEach((course) => {
      if (!codes.includes(course.code)) {
        codes.push(course.code);
      }
    });
  });
  return codes.map((code) => ({
    code: code,
  }));
}

interface PageProps {
  params: { code: string };
}

export default function CoursePage({ params }: PageProps) {
  const code = decodeURIComponent(params.code);
  return (
    <Suspense fallback={
      <div className="cd-wrapper" style={{ padding: '24px' }}>
        <div className="cd-skeletons">
          <div className="skeleton" style={{ height: '48px', width: '100%', borderRadius: '8px' }} />
          <div className="skeleton" style={{ height: '200px', width: '100%', borderRadius: '12px', marginTop: '16px' }} />
        </div>
      </div>
    }>
      <CourseDetail courseCode={code} />
    </Suspense>
  );
}
