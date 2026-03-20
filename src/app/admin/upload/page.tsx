'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, CheckCircle2, Loader2, AlertCircle, Zap, Clock, ListOrdered } from 'lucide-react';

const COURSES = [
  { code: 'B102',  name: 'Botany',           ar: 'علم النبات',  doctors: [] },
  { code: 'C102',  name: 'Chemistry',         ar: 'الكيمياء',    doctors: ['Physical Chemistry', 'Organic Chemistry'] },
  { code: 'CS102', name: 'Computer Science',  ar: 'علم الحاسب', doctors: [] },
  { code: 'G102',  name: 'Geology',           ar: 'الجيولوجيا', doctors: [] },
  { code: 'M102',  name: 'Mathematics',       ar: 'الرياضيات',  doctors: [] },
  { code: 'P102',  name: 'Physics',           ar: 'الفيزياء',   doctors: ['Dr. Essam', 'Dr. Wagida', 'Dr. Abdulrahman'] },
  { code: 'Z102',  name: 'Zoology',           ar: 'علم الحيوان', doctors: [] },
];

type Status = 'idle' | 'uploading' | 'queued' | 'error';

export default function AutoUploadPage() {
  const [courseCode, setCourseCode] = useState('');
  const [instructor, setInstructor] = useState('');
  const [lectureNumber, setLectureNumber] = useState('');
  const [lectureTitle, setLectureTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const selectedCourse = COURSES.find(c => c.code === courseCode);

  const handleFile = (f: File) => {
    if (f.type !== 'application/pdf') {
      setStatus('error');
      setMessage('Only PDF files are accepted.');
      return;
    }
    setFile(f);
    setStatus('idle');
    setMessage('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file || !courseCode) return;
    setStatus('uploading');

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('courseCode', courseCode);
    formData.append('instructor', instructor);
    formData.append('lectureNumber', lectureNumber);
    formData.append('lectureTitle', lectureTitle || `${selectedCourse?.name} — Lecture ${lectureNumber}`);

    try {
      const res = await fetch('/api/n8n/upload-trigger', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStatus('queued');
      setMessage(data.message);
      setQueuePosition(data.position);
      setFile(null);
      setCourseCode('');
      setInstructor('');
      setLectureNumber('');
      setLectureTitle('');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="h-8 w-8 text-yellow-500" />
        <div>
          <h1 className="text-2xl font-bold">Auto Lecture Upload</h1>
          <p className="text-muted-foreground text-sm">Upload a PDF — n8n handles everything automatically, one lecture at a time</p>
        </div>
      </div>

      {/* Pipeline explanation */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-purple-900 mb-3">🤖 Automated pipeline (runs every 15 min):</p>
          <div className="grid grid-cols-2 gap-2 text-sm text-purple-800">
            {['1. PDF saved locally', '2. Gemini reads PDF', '3. 20 MCQ + 10 T/F quiz generated', '4. YouTube searched in Arabic', '5. Lesson created as draft', '6. You review & publish'].map(step => (
              <div key={step} className="flex items-center gap-2">
                <span className="text-purple-500">✓</span> {step}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status banner */}
      {status === 'queued' && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="pt-4 flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">{message}</p>
              {queuePosition && (
                <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                  <ListOrdered className="h-3 w-3" />
                  Queue position: #{queuePosition} — estimated wait: ~{queuePosition * 15} minutes
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload PDF Lecture</CardTitle>
          <CardDescription>Fill in details, then drop your PDF</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Course */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Course *</label>
            <Select value={courseCode} onValueChange={v => { setCourseCode(v); setInstructor(''); }}>
              <SelectTrigger><SelectValue placeholder="Select course..." /></SelectTrigger>
              <SelectContent>
                {COURSES.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name} <span className="text-muted-foreground text-xs ml-2">{c.ar}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Doctor (only for Physics) */}
          {selectedCourse?.doctors && selectedCourse.doctors.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Doctor / Section</label>
              <Select value={instructor} onValueChange={setInstructor}>
                <SelectTrigger><SelectValue placeholder="Select doctor..." /></SelectTrigger>
                <SelectContent>
                  {selectedCourse.doctors.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Lecture number + title */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lecture Number *</label>
              <input
                type="number"
                value={lectureNumber}
                onChange={e => setLectureNumber(e.target.value)}
                placeholder="e.g. 3"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title (optional)</label>
              <input
                type="text"
                value={lectureTitle}
                onChange={e => setLectureTitle(e.target.value)}
                placeholder="e.g. Wave Motion"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => document.getElementById('pdf-file')?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-muted-foreground/30 hover:border-primary/40'}`}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            {file ? (
              <div>
                <p className="font-medium text-green-700">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div>
                <p className="font-medium">Drop PDF here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Only .pdf files</p>
              </div>
            )}
            <input id="pdf-file" type="file" accept=".pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {message}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!file || !courseCode || !lectureNumber || status === 'uploading'}
            className="w-full" size="lg"
          >
            {status === 'uploading'
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
              : <><Zap className="h-4 w-4 mr-2" />Add to Queue</>}
          </Button>

          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" />
            Lectures are processed one at a time, every 15 minutes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
