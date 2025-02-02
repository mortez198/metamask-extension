const { strict: assert } = require('assert');
const { convertToHexValue, withFixtures, openDapp } = require('../helpers');
const FixtureBuilder = require('../fixture-builder');

async function getEncryptionKey(driver) {
  await driver.clickElement('#getEncryptionKeyButton');
  await driver.waitUntilXWindowHandles(3);
  let windowHandles = await driver.getAllWindowHandles();
  await driver.switchToWindowWithTitle('MetaMask Notification', windowHandles);
  await driver.waitForSelector({
    css: '.request-encryption-public-key__header__text',
    text: 'Request encryption public key',
  });
  await driver.clickElement({ text: 'Provide', tag: 'button' });
  await driver.waitUntilXWindowHandles(2);
  windowHandles = await driver.getAllWindowHandles();
  await driver.switchToWindowWithTitle('E2E Test Dapp', windowHandles);
  return await driver.findElement('#encryptionKeyDisplay');
}

async function encryptMessage(driver, message) {
  await driver.fill('#encryptMessageInput', message);
  await driver.clickElement('#encryptButton');
  await driver.waitForSelector({
    css: '#ciphertextDisplay',
    text: '0x',
  });
}

async function decryptMessage(driver) {
  await driver.clickElement('#decryptButton');
  await driver.waitUntilXWindowHandles(3);
  const windowHandles = await driver.getAllWindowHandles();
  await driver.switchToWindowWithTitle('MetaMask Notification', windowHandles);
  await driver.waitForSelector({
    css: '.request-decrypt-message__header__text',
    text: 'Decrypt request',
  });
}

async function verifyDecryptedMessageMM(driver, message) {
  await driver.clickElement({ text: 'Decrypt message', tag: 'div' });
  const notificationMessage = await driver.isElementPresent({
    text: message,
    tag: 'div',
  });
  assert.equal(notificationMessage, true);
  await driver.clickElement({ text: 'Decrypt', tag: 'button' });
}

async function verifyDecryptedMessageDapp(driver, message) {
  const windowHandles = await driver.getAllWindowHandles();
  await driver.switchToWindowWithTitle('E2E Test Dapp', windowHandles);
  const clearTextLabel = await driver.findElement('#cleartextDisplay');
  assert.equal(await clearTextLabel.getText(), message);
}

describe('Encrypt Decrypt', function () {
  const ganacheOptions = {
    accounts: [
      {
        secretKey:
          '0x7C9529A67102755B7E6102D6D950AC5D5863C98713805CEC576B945B15B71EAC',
        balance: convertToHexValue(25000000000000000000),
      },
    ],
  };
  const encryptionKey = 'fxYXfCbun026g5zcCQh7Ia+O0urAEVZWLG8H4Jzu7Xs=';
  const message = 'Hello, Bob!';
  it('should decrypt an encrypted message', async function () {
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);
        await openDapp(driver);

        // ------ Get Encryption key ------
        const encryptionKeyLabel = await getEncryptionKey(driver);
        assert.equal(await encryptionKeyLabel.getText(), encryptionKey);

        // ------ Encrypt ------
        await encryptMessage(driver, message);

        // ------ Decrypt ------
        await decryptMessage(driver);

        // Account balance is converted properly
        const decryptAccountBalanceLabel = await driver.findElement(
          '.request-decrypt-message__balance-value',
        );
        assert.equal(await decryptAccountBalanceLabel.getText(), '25 ETH');
        // Verify message in MetaMask Notification
        await verifyDecryptedMessageMM(driver, message);

        // Verify message in Test Dapp
        await driver.waitUntilXWindowHandles(2);
        await verifyDecryptedMessageDapp(driver, message);
      },
    );
  });

  it('should encrypt and decrypt multiple messages', async function () {
    const message2 = 'Hello, Alice!';
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);
        await openDapp(driver);

        // ------ Get Encryption key ------
        const encryptionKeyLabel = await getEncryptionKey(driver);
        assert.equal(await encryptionKeyLabel.getText(), encryptionKey);

        // ------ Encrypt Message 1------
        await encryptMessage(driver, message);

        // ------ Decrypt Message 1 ------
        await decryptMessage(driver);

        // ------ Switch to Dapp ------
        let windowHandles = await driver.getAllWindowHandles();
        await driver.switchToWindowWithTitle('E2E Test Dapp', windowHandles);

        // ------ Encrypt Message 2------
        await encryptMessage(driver, message2);

        // ------ Decrypt Message 2 ------
        await decryptMessage(driver);

        // Verify message 1 in MetaMask Notification
        await verifyDecryptedMessageMM(driver, message);

        // Verify message 1 in Test Dapp
        await verifyDecryptedMessageDapp(driver, message);

        // ------ Switch to Dapp ------
        windowHandles = await driver.getAllWindowHandles();
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );

        // Verify message 2 in MetaMask Notification
        await verifyDecryptedMessageMM(driver, message2);

        // Verify message 2 in Test Dapp
        await verifyDecryptedMessageDapp(driver, message2);
      },
    );
  });

  it('should show balance correctly as ETH', async function () {
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);
        await openDapp(driver);

        // ------ Get Encryption key and display ETH ------
        await driver.clickElement('#getEncryptionKeyButton');
        await driver.waitUntilXWindowHandles(3);
        const windowHandles = await driver.getAllWindowHandles();
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );
        await driver.waitForSelector({
          css: '.request-encryption-public-key__header__text',
          text: 'Request encryption public key',
        });
        // Account balance is converted properly
        const accountBalanceLabel = await driver.findElement(
          '.request-encryption-public-key__balance-value',
        );
        assert.equal(await accountBalanceLabel.getText(), '25 ETH');
      },
    );
  });

  it('should show balance correctly as Fiat', async function () {
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .withPreferencesController({
            preferences: {
              useNativeCurrencyAsPrimaryCurrency: false,
            },
          })
          .build(),
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        await openDapp(driver);

        // ------ Get Encryption key and display ETH ------
        await driver.clickElement('#getEncryptionKeyButton');
        await driver.waitUntilXWindowHandles(3);
        const windowHandles = await driver.getAllWindowHandles();
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );
        await driver.waitForSelector({
          css: '.request-encryption-public-key__header__text',
          text: 'Request encryption public key',
        });

        // Account balance is converted properly
        const accountBalanceLabel = await driver.findElement(
          '.request-encryption-public-key__balance-value',
        );
        assert.equal(await accountBalanceLabel.getText(), '$42,500.00 USD');
      },
    );
  });
});
