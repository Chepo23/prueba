import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase';

// Crear un nuevo presupuesto
export const createBudget = async (userId, budgetData) => {
  try {
    const budgetsRef = collection(db, 'budgets');
    const docRef = await addDoc(budgetsRef, {
      ...budgetData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error al crear presupuesto:', error);
    throw error;
  }
};

// Obtener presupuestos del usuario
export const getUserBudgets = async (userId) => {
  try {
    const budgetsRef = collection(db, 'budgets');
    const q = query(
      budgetsRef, 
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const budgets = [];
    
    querySnapshot.forEach((doc) => {
      budgets.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Ordenar en el cliente por fecha de creación (más recientes primero)
    budgets.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
    
    return budgets;
  } catch (error) {
    console.error('Error al obtener presupuestos:', error);
    throw error;
  }
};

// Actualizar presupuesto
export const updateBudget = async (budgetId, budgetData) => {
  try {
    const budgetRef = doc(db, 'budgets', budgetId);
    await updateDoc(budgetRef, {
      ...budgetData,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error al actualizar presupuesto:', error);
    throw error;
  }
};

// Eliminar presupuesto
export const deleteBudget = async (budgetId) => {
  try {
    const budgetRef = doc(db, 'budgets', budgetId);
    await deleteDoc(budgetRef);
  } catch (error) {
    console.error('Error al eliminar presupuesto:', error);
    throw error;
  }
};
