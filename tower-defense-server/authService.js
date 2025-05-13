const { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');

const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || 'us-east-1'
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

module.exports = {
    async registerUser(email, password, username) {
        const params = {
            ClientId: CLIENT_ID,
            Username: email,
            Password: password,
            UserAttributes: [
                {
                    Name: 'preferred_username',
                    Value: username
                },
                {
                    Name: 'email',
                    Value: email
                }
            ]
        };

        try {
            const command = new SignUpCommand(params);
            const response = await cognitoClient.send(command);
            return { success: true, userSub: response.UserSub };
        } catch (error) {
            console.error('Error registering user:', error);
            return { success: false, error: error.message };
        }
    },

    async confirmUser(email, code) {
        const params = {
            ClientId: CLIENT_ID,
            Username: email,
            ConfirmationCode: code
        };

        try {
            const command = new ConfirmSignUpCommand(params);
            await cognitoClient.send(command);
            return { success: true };
        } catch (error) {
            console.error('Error confirming user:', error);
            return { success: false, error: error.message };
        }
    },

    async loginUser(email, password) {
        const params = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: CLIENT_ID,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password
            }
        };

        try {
            const command = new InitiateAuthCommand(params);
            const response = await cognitoClient.send(command);

            return {
                success: true,
                accessToken: response.AuthenticationResult.AccessToken,
                refreshToken: response.AuthenticationResult.RefreshToken,
                idToken: response.AuthenticationResult.IdToken,
                expiresIn: response.AuthenticationResult.ExpiresIn
            };
        } catch (error) {
            console.error('Error logging in:', error);
            return { success: false, error: error.message };
        }
    }
};