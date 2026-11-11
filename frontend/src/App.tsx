import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Landing } from './components/Landing';
import { Workspace } from './components/Workspace';
import { EASE } from './components/ui';

type View = 'landing' | 'workspace';

export default function App() {
  const [view, setView] = useState<View>('landing');
  const reduce = useReducedMotion();
  return (
    <div className="grain min-h-screen bg-paper text-ink">
      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div
            key="landing"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <Landing onEnter={() => setView('workspace')} />
          </motion.div>
        ) : (
          <motion.div
            key="workspace"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <Workspace onExit={() => setView('landing')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
