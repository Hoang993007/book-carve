import { useState } from 'react';
import { BookView } from './book/book-view';
import { LibraryView } from './library/library-view';

export function App() {
  const [bookId, setBookId] = useState<string | null>(null);
  return bookId ? <BookView bookId={bookId} onBack={() => setBookId(null)} /> : <LibraryView onOpen={setBookId} />;
}
