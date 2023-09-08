import { Page, expect, test } from '@playwright/test';
import { changeLanguageToEnglish, login } from '../test-utils/test-helpers';
import { LearningObject } from 'app/modules/academy-app/learning-objects/models/learning-object.model';
import { v4 as uuid } from 'uuid';

const endpoint = '*/**/my/academy/learningObject';
const learningObjects = [];

test.beforeEach(async ({ page }) => {
  await page.goto('/home');

  // Click the launch app link .
  await page.getByRole('link', { name: 'Launch the App' }).click();

  await login(page);

  // change the language
  await changeLanguageToEnglish(page);

  // navigate to learning  object s
  await page.getByRole('link', { name: 'Learning Objects' }).click();

  // Mock api calls
  await mockCreateRequest(page);
  await mockGetById(page);
  await mockAddChildRequest(page);
});

test.describe('Create a learning object from list view', () => {
  test('should be able to create a new learning object', async ({ page }) => {
    // Mock the response of the create learningObject request.
    const learningObjectName = 'Test Learning Object 1';

    // Click the new button
    await page.getByRole('button', { name: 'New' }).click();

    // Fill the form
    await page.getByLabel('Name *').fill(learningObjectName);
    await page.getByLabel('Type *').click();
    await page.getByRole('option', { name: 'Module' }).click();
    await page
      .getByLabel('Description')
      .fill('Description of the  object  is here');
    await page.getByRole('button', { name: 'Add' }).click();

    // Expect to see the new learningObject in the list.
    await expect(
      page.locator('a').filter({ hasText: learningObjectName }).first(),
    ).toBeVisible();
  });

  test('should be able to build a tree of learning objects', async ({
    page,
  }) => {
    // Mock the response of the create learningObject request.
    const learningObjectName = 'Test Learning Object 1';

    // Click the new button
    await page.getByRole('button', { name: 'New' }).click();
    const module = {
      name: learningObjectName,
      type: 'Module',
      description: 'Lorem ipsume set ament....',
    };

    // Create a module
    await createLearningObject(module as any, page);

    //  Goto the tree view
    await page
      .locator('a')
      .filter({ hasText: learningObjectName })
      .getByRole('button')
      .nth(1)
      .click();
    // Expect the learning object to be visible in the tree view
    await expect(
      page.getByText(learningObjectName, { exact: true }).first(),
    ).toBeVisible();

    // Create a study
    const study = {
      name: ' Test study',
      type: 'Study',
      description: 'Lorem ipsume set ament....',
    };
    // click the add button
    await page.locator('button').filter({ hasText: 'add' }).first().click();
    await createLearningObject(study as any, page);
    // Expect to see the study created in the tree view
    await expect(page.getByText(study.name, { exact: true })).toBeVisible();

    // Create lesson
    const lesson = {
      name: ' Test lesson',
      type: 'Lesson',
      description: 'Lorem ipsume set ament....',
    };
    await page
      .getByRole('tree')
      .locator('div')
      .filter({ hasText: `${study.name} add` })
      .getByRole('button')
      .click();

    await createLearningObject(lesson as any, page);
    // Expect to see the study created in the tree view
    await expect(page.getByText(lesson.name, { exact: true })).toBeVisible();

    // Create study2
    const study2 = {
      name: ' Test study 2',
      type: 'Study',
      description: 'Lorem ipsume set ament....',
    };
    // click the add button
    await page.locator('button').filter({ hasText: 'add' }).first().click();
    await createLearningObject(study2 as any, page);
    // Expect to see the study created in the tree view
    await expect(page.getByText(study2.name, { exact: true })).toBeVisible();

    // Create lesson2
    const lesson2 = {
      name: ' Test lesson2',
      type: 'Lesson',
      description: 'Lorem ipsume set ament....',
    };
    await page
      .getByRole('tree')
      .locator('div')
      .filter({ hasText: `${study2.name} add` })
      .getByRole('button')
      .click();

    await createLearningObject(lesson2 as any, page);
    // Expect to see the study created in the tree view
    await expect(page.getByText(lesson2.name, { exact: true })).toBeVisible();
  });
});

const createLearningObject = async (
  data: LearningObject['data'],
  page: Page,
): Promise<void> => {
  // Fill the form
  await page.getByLabel('Name *').fill(data.name);
  await page.getByLabel('Type *').click();
  await page.getByRole('option', { name: data['type'] }).click();
  await page.getByLabel('Description').fill(data.description);
  await page.getByRole('button', { name: 'Add' }).click();
};

const addChild = (
  tree: LearningObject,
  parentId: string,
  childObject: LearningObject,
): LearningObject => {
  const parent = findParent(tree, parentId);

  if (parent) {
    const newTree = Object.assign({}, tree);
    const children = [...parent.data.children];
    children.push(childObject);
    parent.data.children = children;
    return newTree;
  } else {
    console.log('Parent not found');
    return tree;
  }
};

const findParent = (node: LearningObject, parentId): LearningObject => {
  if (node.id === parentId) {
    return node;
  }
  if (node.data.children.length) {
    for (const child of node.data.children) {
      const parent = findParent(child, parentId);
      if (parent) {
        return parent;
      }
    }
  }
  return null;
};

// Mock the response of the get learning object  by id request.
const mockGetById = async (page: Page): Promise<void> => {
  await page.route(`${endpoint}/*`, async (route) => {
    const url = route.request().url();
    const id = url.split('/').pop();
    const learningObject = learningObjects.find((obj) => obj.id === id);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(learningObject),
    });
  });
};

const mockCreateRequest = async (page: Page): Promise<LearningObject> => {
  let newLearningObject;
  await page.route(endpoint, async (route) => {
    const request = route.request();
    const postData = await request.postDataJSON();
    newLearningObject = {
      data: { ...postData, children: [] },
      id: uuid(),
    };
    learningObjects.push(newLearningObject);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(newLearningObject),
    });
  });

  return newLearningObject;
};

// Mock the response of add child object.
const mockAddChildRequest = async (page: Page): Promise<void> => {
  await page.route(`${endpoint}/*/addChild/*`, async (route) => {
    const url = route.request().url();
    const urlParts = url.split('/');
    urlParts.reverse();
    const [childId, addChildStr, parentId, ...others] = urlParts;

    const root = learningObjects[0];
    const child = learningObjects.find((obj) => obj.id === childId);
    const newRoot = addChild(root, parentId, child);
    learningObjects[0] = newRoot;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: parentId }),
    });
  });
};
