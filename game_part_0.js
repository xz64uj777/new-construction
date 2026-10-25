import * as THREE from 'three';
import { CONTRACT_STAGES, LOAN, availableContracts, currentContract, isStageInContract, advanceCareer, assignCrew, canTakeLoan, createCareer, crewQuote, currentStage, loadCareer, performWork, purchaseMachine, restartTask, saveCareer, startNextContract, takeLoan } from './game-state.mjs';
// ... rest of part truncated for size in this call