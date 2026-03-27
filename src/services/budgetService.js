import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  where,
  getDoc
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

// Obtener un presupuesto específico por ID
export const getBudgetById = async (budgetId, userId) => {
  try {
    const budgetRef = doc(db, 'budgets', budgetId);
    const docSnapshot = await getDoc(budgetRef);
    
    if (!docSnapshot.exists()) {
      console.error('El presupuesto no existe');
      return null;
    }
    
    const budgetData = docSnapshot.data();
    
    // Verificar que el presupuesto pertenece al usuario
    if (budgetData.userId !== userId) {
      console.error('No tienes permiso para acceder a este presupuesto');
      return null;
    }
    
    return {
      id: docSnapshot.id,
      ...budgetData
    };
  } catch (error) {
    console.error('Error al obtener presupuesto:', error);
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
