import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Provider, useDispatch, useSelector } from 'react-redux';

// ==========================================
// 1. ASYNC THUNK & SLICES (Quản lý State)
// ==========================================

// Lấy dữ liệu sản phẩm từ API (thay thế api.example.com bằng fakestoreapi để chạy thật)[cite: 5]
const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async () => {
    const response = await fetch('https://fakestoreapi.com/products?limit=5');
    if (!response.ok) throw new Error('Failed to fetch products');
    return await response.json();
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    status: 'idle', // Xử lý trạng thái: 'idle' | 'loading' | 'succeeded' | 'failed'[cite: 5]
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Unknown error';
      });
  }
});

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [], // RN không dùng localStorage đồng bộ, khởi tạo mảng rỗng[cite: 5]
    discountCode: null,
    taxRate: 0.1, // Tính thuế 10%[cite: 5]
    shippingCost: 10 // Phí vận chuyển mặc định[cite: 5]
  },
  reducers: {
    addToCart: (state, action) => {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({ ...action.payload, quantity: 1 });
      }
    },
    increaseQuantity: (state, action) => {
      const item = state.items.find(item => item.id === action.payload);
      if (item) item.quantity += 1;
    },
    decreaseQuantity: (state, action) => {
      const item = state.items.find(item => item.id === action.payload);
      if (item && item.quantity > 1) item.quantity -= 1;
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    clearCart: (state) => {
      state.items = [];
    },
    applyDiscount: (state, action) => {
      state.discountCode = action.payload; // Cập nhật mã giảm giá[cite: 5]
    },
    setShippingCost: (state, action) => {
      state.shippingCost = action.payload; // Cập nhật phí vận chuyển[cite: 5]
    }
  }
});

const { addToCart, increaseQuantity, decreaseQuantity, removeFromCart, applyDiscount, setShippingCost } = cartSlice.actions;

// ==========================================
// 2. SELECTORS (Tính toán dữ liệu giỏ hàng)
// ==========================================

const selectSubtotal = (state) =>
  state.cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

const selectDiscount = (state) => {
  const subtotal = selectSubtotal(state);
  const discountRates = {
    'SUMMER10': 0.1,
    'SPECIAL20': 0.2
  };
  const rate = discountRates[state.cart.discountCode || ''] || 0;
  return subtotal * rate; // Tính giảm giá[cite: 5]
};

const selectTax = (state) => {
  const subtotal = selectSubtotal(state);
  return subtotal * state.cart.taxRate; // Tính thuế[cite: 5]
};

const selectCartTotal = (state) => {
  const subtotal = selectSubtotal(state);
  const discount = selectDiscount(state);
  const tax = selectTax(state);
  return subtotal - discount + tax + state.cart.shippingCost; // Tổng tiền cuối cùng[cite: 5]
};

// Chi tiết hóa đơn[cite: 5]
const selectCartSummary = (state) => ({
  subtotal: selectSubtotal(state),
  discount: selectDiscount(state),
  tax: selectTax(state),
  shipping: state.cart.shippingCost,
  total: selectCartTotal(state),
  itemCount: state.cart.items.reduce((count, item) => count + item.quantity, 0)
});

// ==========================================
// 3. STORE (Kho lưu trữ Redux)
// ==========================================

const store = configureStore({
  reducer: {
    cart: cartSlice.reducer,
    products: productsSlice.reducer
  }
});

// ==========================================
// 4. COMPONENTS (Giao diện người dùng)
// ==========================================

function ShoppingCart() {
  const dispatch = useDispatch();
  const products = useSelector((state) => state.products.items);
  const productsStatus = useSelector((state) => state.products.status);
  const cartItems = useSelector((state) => state.cart.items);
  const summary = useSelector(selectCartSummary);

  useEffect(() => {
    if (productsStatus === 'idle') {
      dispatch(fetchProducts());
    }
  }, [dispatch, productsStatus]);

  if (productsStatus === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Đang tải sản phẩm...</Text>
      </View>
    );
  }

  if (productsStatus === 'failed') {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red' }}>Lỗi tải dữ liệu</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.mainTitle}>🛍️ Cửa Hàng Trực Tuyến (Level 3)</Text>

      {/* DANH SÁCH SẢN PHẨM */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sản Phẩm Có Sẵn</Text>
        {products.map(product => (
          <View key={product.id} style={styles.card}>
            <Text style={styles.itemName} numberOfLines={1}>{product.title}</Text>
            <Text style={styles.itemPrice}>${product.price.toFixed(2)}</Text>
            <TouchableOpacity 
              style={styles.btnPrimary} 
              onPress={() => dispatch(addToCart({ id: product.id, title: product.title, price: product.price }))}
            >
              <Text style={styles.btnText}>Thêm</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* GIỎ HÀNG */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Giỏ Hàng ({summary.itemCount} sản phẩm)</Text>
        {cartItems.length === 0 ? (
          <Text>Giỏ hàng trống</Text>
        ) : (
          cartItems.map(item => (
            <View key={item.id} style={styles.cartItem}>
              <Text style={styles.itemName} numberOfLines={1}>{item.title}</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity style={styles.btnSmall} onPress={() => dispatch(decreaseQuantity(item.id))}>
                  <Text style={styles.btnTextDark}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.btnSmall} onPress={() => dispatch(increaseQuantity(item.id))}>
                  <Text style={styles.btnTextDark}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
              <TouchableOpacity style={styles.btnDanger} onPress={() => dispatch(removeFromCart(item.id))}>
                <Text style={styles.btnText}>Xóa</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* MÃ GIẢM GIÁ & VẬN CHUYỂN */}
      <View style={styles.sectionRow}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.sectionTitle}>Mã Giảm Giá</Text>
          <TouchableOpacity style={styles.btnOutline} onPress={() => dispatch(applyDiscount('SUMMER10'))}>
            <Text>SUMMER10 (-10%)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnOutline} onPress={() => dispatch(applyDiscount('SPECIAL20'))}>
            <Text>SPECIAL20 (-20%)</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Vận Chuyển</Text>
          <TouchableOpacity style={styles.btnOutline} onPress={() => dispatch(setShippingCost(0))}>
            <Text>Miễn phí ($0)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnOutline} onPress={() => dispatch(setShippingCost(10))}>
            <Text>Tiêu chuẩn ($10)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* TÓM TẮT ĐƠN HÀNG */}
      <View style={styles.summaryBox}>
        <Text style={styles.sectionTitle}>Tóm Tắt Đơn Hàng</Text>
        <View style={styles.row}><Text>Tổng cộng:</Text><Text>${summary.subtotal.toFixed(2)}</Text></View>
        {summary.discount > 0 && (
          <View style={styles.row}>
            <Text style={{ color: 'green' }}>Giảm giá:</Text>
            <Text style={{ color: 'green' }}>-${summary.discount.toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.row}><Text>Thuế (10%):</Text><Text>${summary.tax.toFixed(2)}</Text></View>
        <View style={styles.row}><Text>Vận chuyển:</Text><Text>${summary.shipping.toFixed(2)}</Text></View>
        <View style={[styles.row, { borderTopWidth: 1, marginTop: 10, paddingTop: 10 }]}>
          <Text style={styles.totalText}>Thành Tiền:</Text>
          <Text style={styles.totalText}>${summary.total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={[styles.btnPrimary, { marginTop: 15, padding: 15 }]}>
          <Text style={[styles.btnText, { fontSize: 16 }]}>Thanh Toán</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <ShoppingCart />
    </Provider>
  );
}

// ==========================================
// 5. STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', padding: 15, marginTop: 30 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  section: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 10 },
  cartItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, backgroundColor: '#f1f1f1', padding: 10, borderRadius: 8 },
  itemName: { flex: 2, fontSize: 13, fontWeight: 'bold' },
  itemPrice: { flex: 1, textAlign: 'center', color: '#e91e63' },
  quantityRow: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  quantityText: { marginHorizontal: 8, fontWeight: 'bold' },
  btnPrimary: { backgroundColor: '#2196F3', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 5, alignItems: 'center' },
  btnDanger: { backgroundColor: '#f44336', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 5 },
  btnSmall: { backgroundColor: '#ddd', width: 26, height: 26, justifyContent: 'center', alignItems: 'center', borderRadius: 13 },
  btnOutline: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 5, marginBottom: 5, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  btnTextDark: { color: '#333', fontWeight: 'bold' },
  summaryBox: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  totalText: { fontSize: 18, fontWeight: 'bold', color: '#e91e63' }
});