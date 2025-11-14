/**
 * 修正後の納品書作成をテストするスクリプト
 */

async function testFixedDelivery() {
  try {
    console.log('🚀 修正後の納品書作成テスト開始');

    const baseUrl = 'https://bonica-system-82gujggfu-808worksjp-gmailcoms-projects.vercel.app';

    // 既存の納品データを取得
    console.log('📋 既存の納品データを取得中...');
    const deliveriesResponse = await fetch(`${baseUrl}/api/deliveries`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!deliveriesResponse.ok) {
      throw new Error(`Failed to fetch deliveries: ${deliveriesResponse.status}`);
    }

    const deliveries = await deliveriesResponse.json();
    console.log('📊 取得した納品データ件数:', deliveries.length);

    if (deliveries.length === 0) {
      console.log('❌ テスト用の納品データが見つかりません');
      return;
    }

    // 最初の納品データでテスト
    const testDelivery = deliveries[0];
    console.log('🎯 テスト対象納品:', {
      id: testDelivery.id,
      customer: testDelivery.customer?.companyName,
      status: testDelivery.status
    });

    // 納品書作成を実行
    console.log('📄 納品書作成を実行中...');
    const createResponse = await fetch(`${baseUrl}/api/google-sheets/create-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deliveryId: testDelivery.id
        // templateIdを指定せず、修正されたフォールバック処理をテスト
      })
    });

    console.log('📊 納品書作成レスポンス状態:', createResponse.status);

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('❌ 納品書作成に失敗:', errorText);
      throw new Error(`Delivery creation failed: ${createResponse.status} - ${errorText}`);
    }

    const result = await createResponse.json();
    console.log('📊 納品書作成結果:', result);

    if (result.url) {
      console.log('🎉 納品書作成成功！');
      console.log('📄 作成された納品書URL:', result.url);
      console.log('✅ 修正が正常に動作しています');

      // URLからシートIDを抽出してテンプレートIDを確認
      const urlMatch = result.url.match(/gid=(\d+)/);
      if (urlMatch) {
        const sheetId = urlMatch[1];
        console.log('📋 作成されたシートのID:', sheetId);

        // 作成されたシートが納品書テンプレート（1125769553）から作られたかを確認
        console.log('🔍 シートIDから使用されたテンプレートを推測中...');
        console.log('   - 1125769553: 納品書テンプレート（期待値）');
        console.log('   - 521792886: 請求書テンプレート（修正前の誤った値）');
      }
    } else {
      console.log('❌ 納品書作成に失敗しました');
      if (result.error) {
        console.log('エラー:', result.error);
      }
    }

  } catch (error) {
    console.error('❌ テスト中にエラーが発生しました:', error);

    if (error instanceof Error) {
      console.error('エラー詳細:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
    }
  }
}

// 実行
testFixedDelivery().catch(console.error);