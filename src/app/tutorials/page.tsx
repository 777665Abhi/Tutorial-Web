import { redirect } from 'next/navigation';

export default function TutorialsIndex() {
  // We don't have a specific page for just '/tutorials'. 
  // All tutorials exist under a category like '/tutorials/android'
  // So we redirect the user back to the home page to select a category.
  redirect('/');
}
