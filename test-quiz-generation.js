const quizService = require('./src/services/quiz-service.ts');

async function testQuizGeneration() {
  try {
    console.log('Tentativo di generazione quiz...');
    const quiz = await quizService.generateQuiz('matematica');
    console.log('Quiz generato:', quiz);
  } catch (error) {
    console.error('Errore durante la generazione del quiz:', error);
  }
}

testQuizGeneration();
