const BASE_URL = 'https://bonica-system.vercel.app';

async function fixProductionLogin() {
  console.log('🔧 本番環境ログイン問題修正開始')

  try {
    // 1. ヘルスチェック
    console.log('\n🏥 ヘルスチェック...')
    const healthResponse = await fetch(`${BASE_URL}/api/health`)
    const healthData = await healthResponse.json()
    console.log('Health Status:', healthData)

    // 2. 初期化状態確認
    console.log('\n🔍 初期化キーテスト...')
    const initResponse = await fetch(`${BASE_URL}/api/admin/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 8YEwoMWlaMUh3J1HDzQWneBcvNPwAwYUzkEIdVS808I='
      },
      body: JSON.stringify({})
    })

    console.log('Init Status:', initResponse.status)
    const initData = await initResponse.json()
    console.log('Init Response:', initData)

    // 3. ログインテスト（詳細）
    console.log('\n🔐 ログインテスト...')
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '808works@gmail.com',
        password: '6391'
      })
    })

    console.log('Login Status:', loginResponse.status)
    console.log('Login Headers:', Object.fromEntries(loginResponse.headers.entries()))

    const loginText = await loginResponse.text()
    console.log('Login Raw Response:', loginText)

    try {
      const loginData = JSON.parse(loginText)
      console.log('Login Parsed Response:', loginData)
    } catch (e) {
      console.log('Response is not JSON:', loginText.substring(0, 200))
    }

    // 4. 環境変数推定テスト
    console.log('\n🔧 環境変数問題診断...')

    // JWT無効ログインで環境変数の存在確認
    const jwtTestResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fake@email.com', password: 'fake' })
    })

    const jwtTestData = await jwtTestResponse.json()
    console.log('JWT Test Response:', jwtTestData)

    if (jwtTestData.error === 'サーバー設定エラー') {
      console.log('❌ JWT_SECRET環境変数が設定されていません')
    } else if (jwtTestData.error === 'ユーザーが見つかりません') {
      console.log('✅ JWT_SECRET環境変数は設定されています')
    }

  } catch (error) {
    console.error('❌ 修正プロセス中にエラー:', error)
  }
}

fixProductionLogin()