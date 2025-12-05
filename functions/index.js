const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Відправити FCM нотифікацію користувачу
 */
async function sendFCMNotification(userId, title, body, data = {}) {
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return;
    }

    const userData = userDoc.data();
    
    if (!userData.notificationsEnabled || !userData.fcmToken) {
      return;
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);
          return acc;
        }, {}),
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      token: userData.fcmToken,
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    return response;
  } catch (error) {
    console.error('Помилка відправки FCM нотифікації:', error);
    throw error;
  }
}

/**
 * Cloud Function: Нотифікація при наданні доступу до проєктів
 * Відстежує зміни в sharedUsers і відправляє одну нотифікацію з кількістю проектів
 */
exports.onProjectAccessGranted = functions
  .runWith({
    minInstances: 0,
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const ownerId = context.params.userId;

    const beforeShared = before.sharedUsers || [];
    const afterShared = after.sharedUsers || [];
    
    // Знаходимо нових користувачів, які додалися до sharedUsers
    const newUsers = afterShared.filter(uid => !beforeShared.includes(uid));
    
    if (newUsers.length > 0) {
      // Отримуємо дані власника
      const ownerDoc = await admin.firestore().collection('users').doc(ownerId).get();
      const ownerData = ownerDoc.data();
      
      // Чекаємо трохи, щоб проекти встигли оновитися (додати користувача до members)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Для кожного нового користувача підраховуємо кількість проектів, до яких він має доступ
      for (const newUserId of newUsers) {
        // Отримуємо всі проекти власника, де користувач є в members
        const projectsSnapshot = await admin.firestore()
          .collection('projects')
          .where('createdBy', '==', ownerId)
          .get();
        
        // Підраховуємо проекти, до яких користувач має доступ
        let projectsCount = 0;
        projectsSnapshot.forEach(doc => {
          const projectData = doc.data();
          const members = projectData.members || [];
          if (members.includes(newUserId)) {
            projectsCount++;
          }
        });
        
        if (projectsCount > 0) {
          // Формуємо правильне слово для української мови
          let projectWord;
          const lastDigit = projectsCount % 10;
          const lastTwoDigits = projectsCount % 100;
          
          if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
            projectWord = 'проєктів';
          } else if (lastDigit === 1) {
            projectWord = 'проєкту';
          } else if (lastDigit >= 2 && lastDigit <= 4) {
            projectWord = 'проєктів';
          } else {
            projectWord = 'проєктів';
          }
          
          await sendFCMNotification(
            newUserId,
            'Доступ надано',
            `${ownerData.displayName || ownerData.email} надав вам доступ до ${projectsCount} ${projectWord}`,
            {
              type: 'access_granted',
              ownerId: ownerId,
              projectsCount: projectsCount,
            }
          );
        }
      }
    }
  });

/**
 * Cloud Function: Нотифікація при додаванні витрати до проєкту
 * Відправляє нотифікацію всім членам проєкту, крім того, хто додав витрату
 */
exports.onExpenseAdded = functions
  .runWith({
    minInstances: 0,
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .firestore
  .document('expenses/{expenseId}')
  .onCreate(async (snap, context) => {
    const expense = snap.data();
    const projectId = expense.projectId;
    const createdBy = expense.createdBy;

    // Отримуємо проєкт
    const projectDoc = await admin.firestore().collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return;
    }

    const project = projectDoc.data();
    const members = project.members || [];

    // Відправляємо нотифікацію всім членам проєкту, крім того, хто додав витрату
    const recipients = members.filter(memberId => memberId !== createdBy);
    
    // Відправляємо нотифікації паралельно (швидше)
    const notificationPromises = recipients.map(memberId =>
      sendFCMNotification(
        memberId,
        'Нова витрата',
        `Додано витрату "${expense.categoryName}" до проєкту "${project.name}"`,
        {
          type: 'expense_added',
          projectId: projectId,
          expenseId: context.params.expenseId,
        }
      )
    );
    
    await Promise.all(notificationPromises);
  });

/**
 * Cloud Function: Нотифікація при додаванні нового проєкту до спільного доступу
 * НЕ відправляє нотифікації - всі нотифікації про доступ відправляються через onProjectAccessGranted
 * (щоб була одна нотифікація з кількістю проектів замість окремих для кожного)
 */
exports.onProjectMemberAdded = functions
  .runWith({
    minInstances: 0,
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .firestore
  .document('projects/{projectId}')
  .onUpdate(async (change, context) => {
    // Не відправляємо нотифікацію з onProjectMemberAdded
    // Всі нотифікації про доступ відправляються через onProjectAccessGranted
    // (одна нотифікація з кількістю проектів замість окремих для кожного)
    return null;
  });

/**
 * Cloud Function: Нотифікація при скасуванні доступу (видалення з sharedUsers)
 * Відстежує зміни в sharedUsers і відправляє простішу нотифікацію без кількості проектів
 * НЕ відправляє нотифікацію коли забирають доступ до окремих проектів (тільки коли скасовують доступ повністю)
 * НЕ відправляє нотифікацію коли користувач сам відписується (self-removal)
 */
exports.onProjectAccessRevoked = functions
  .runWith({
    minInstances: 0,
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const ownerId = context.params.userId;

    const beforeShared = before.sharedUsers || [];
    const afterShared = after.sharedUsers || [];
    
    // Знаходимо користувачів, які були видалені з sharedUsers (скасування доступу)
    const removedUsers = beforeShared.filter(uid => !afterShared.includes(uid));
    
    if (removedUsers.length > 0) {
      // Отримуємо дані власника
      const ownerDoc = await admin.firestore().collection('users').doc(ownerId).get();
      const ownerData = ownerDoc.data();
      
      // Відправляємо простішу нотифікацію без підрахунку проектів
      for (const removedUserId of removedUsers) {
        // Перевіряємо, чи це самостійна відписка
        // Якщо видалений користувач має власника в своєму sharedUsers, то це самостійна відписка
        // (користувач сам видаляє себе з sharedUsers власника)
        const removedUserDoc = await admin.firestore().collection('users').doc(removedUserId).get();
        if (removedUserDoc.exists) {
          const removedUserData = removedUserDoc.data();
          const removedUserShared = removedUserData.sharedUsers || [];
          
          // Якщо власник є в sharedUsers видаленого користувача, то це самостійна відписка
          // (користувач сам відписується від власника)
          if (removedUserShared.includes(ownerId)) {
            // Це самостійна відписка - не відправляємо нотифікацію
            continue;
          }
        }
        
        // Це скасування доступу власником - відправляємо нотифікацію
        await sendFCMNotification(
          removedUserId,
          'Доступ скасовано',
          `${ownerData.displayName || ownerData.email} забрав у вас доступ`,
          {
            type: 'access_revoked',
            ownerId: ownerId,
          }
        );
      }
    }
  });

/**
 * Cloud Function: Нотифікація при заборі доступу з проєкту
 * НЕ відправляє нотифікації - всі нотифікації про забору доступу відправляються через onProjectAccessRevoked
 * (щоб була одна нотифікація з кількістю проектів замість окремих для кожного)
 */
exports.onProjectMemberRemoved = functions
  .runWith({
    minInstances: 0,
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .firestore
  .document('projects/{projectId}')
  .onUpdate(async (change, context) => {
    // Не відправляємо нотифікацію з onProjectMemberRemoved
    // Всі нотифікації про забору доступу відправляються через onProjectAccessRevoked
    // (одна нотифікація з кількістю проектів замість окремих для кожного)
    return null;
  });

