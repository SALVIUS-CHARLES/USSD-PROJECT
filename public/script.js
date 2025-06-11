// Common variables
let userRole = null; // "customer" or "retailer"
let ussdInput = "";
let currentInput = "";
let lastKey = "";
let lastKeyPressTime = 100;
let lastKeyIndex = 0;
let cursorVisible = true;
let currentStep = "start";
let cycleTimer = null;
let currentRetailerId = null;
let loginAttempts = 0;

// Customer variables
let retailerList = [];
let productList = [];
let orderDetails = {
  name: "",
  phoneNumber: "",
  location: "",
  cart: [], // Changed: Now an array to hold multiple products {product: obj, quantity: num}
  retailer: null
};

// Retailer variables
let retailerDetails = {
  name: "",
  phoneNumber: "",
  location: "",
  productName: "",
  productPrice: "",
  selectedProduct: null,
  newProductName: "",
  newProductPrice: "",
  loginName: "",
  loginTin: "",    // New: for retailer login TIN
  tinNumber: "" // For retailer registration
};
let productAction = "";
let products = [];
let orders = []; // To store fetched orders
let selectedOrder = null; // New: To store the order chosen for action

const keyMapping = {
  1: ["1", ".", ",", "!"],
  2: ["2", "A", "B", "C"],
  3: ["3", "D", "E", "F"],
  4: ["4", "G", "H", "I"],
  5: ["5", "J", "K", "L"],
  6: ["6", "M", "N", "O"],
  7: ["7", "P", "Q", "R", "S"],
  8: ["8", "T", "U", "V"],
  9: ["9", "W", "X", "Y", "Z"],
  0: ["0", "+"],
};

// Initialize the UI
function updateDisplay() {
  if (currentStep === "start") {
    document.getElementById("displayContent").innerText = "bofya *# kuanza";
    document.getElementById("currentInput").innerText = currentInput;
  } else {
    document.getElementById("displayContent").innerText = ussdInput;
    document.getElementById("currentInput").innerText = currentInput;
  }

  // Update status bar based on role
  if (userRole === "customer") {
    document.getElementById("statusBar").innerText = "Huduma ya USSD - Mteja";
  } else if (userRole === "retailer") {
    document.getElementById("statusBar").innerText = "Huduma ya USSD - Mfanyabiashara";
  } else {
    document.getElementById("statusBar").innerText = "Huduma ya USSD";
  }

  if ((currentStep === "selectRole" && !currentInput) ||
    (currentStep === "selectRetailer" && !currentInput) ||
    (currentStep === "selectProduct" && !currentInput) ||
    (currentStep === "selectProductQuantity" && !currentInput) || // New: for quantity
    (currentStep === "addToCartOptions" && !currentInput)) { // New: for cart options
    document.getElementById("inputLine").style.display = "none";
  } else {
    document.getElementById("inputLine").style.display = "flex";
  }
}

// Input handling functions with visual cues
function cycleInput(value) {
  const now = new Date().getTime();
  const btnId = value === '*' ? 'btnStar' : value === '#' ? 'btnHash' : value === ' ' ? 'spaceButton' : 'btn' + value;
  const button = document.getElementById(btnId);

  // Add visual feedback
  highlightButton(button);

  if (keyMapping[value]) {
    if (value === lastKey && now - lastKeyPressTime < 1000) {
      if (cycleTimer) clearTimeout(cycleTimer);

      lastKeyIndex = (lastKeyIndex + 1) % keyMapping[value].length;
      currentInput = currentInput.slice(0, -1) + keyMapping[value][lastKeyIndex];

      document.getElementById("keyInfo").textContent = `Bonyeza: ${value} - ${keyMapping[value][lastKeyIndex]}`;
    } else {
      lastKeyIndex = 0;
      currentInput += keyMapping[value][lastKeyIndex];
      document.getElementById("keyInfo").textContent = `Bonyeza: ${value} - ${keyMapping[value][lastKeyIndex]}`;
    }

    cycleTimer = setTimeout(() => {
      lastKey = "";
      document.getElementById("keyInfo").textContent = "Bonyeza: Hakuna";
    }, 1000);

    lastKey = value;
    lastKeyPressTime = now;
  } else {
    currentInput += value;
    document.getElementById("keyInfo").textContent = `Bonyeza: ${value}`;
  }

  updateDisplay();
}

function highlightButton(button) {
  button.classList.add("key-pressed");
  setTimeout(() => {
    button.classList.remove("key-pressed");
  }, 150);
}

function deleteInput() {
  highlightButton(document.getElementById("deleteButton"));
  currentInput = currentInput.slice(0, -1);
  updateDisplay();
}

function goBack() {
  highlightButton(document.getElementById("backButton"));
  if (userRole === "customer") {
    customerGoBack();
  } else if (userRole === "retailer") {
    retailerGoBack();
  } else {
    ussdInput = "bofya *# kuanza";
    currentInput = "";
    currentStep = "start";
    userRole = null;
  }
  updateDisplay();
}

function customerGoBack() {
  if (currentStep === "selectRetailer") { // From retailer selection, go to role selection
    currentStep = "selectRole";
    ussdInput = "Chagua chaguo:\n1. Mteja\n2. Mfanyabiashara";
    currentInput = "";
    userRole = null; // Reset role if going back from initial selection
  } else if (currentStep === "selectProduct") { // From product selection, go to retailer selection
    currentStep = "selectRetailer";
    currentInput = "";
    fetchRetailers(); // Re-fetch retailers list
  } else if (currentStep === "selectProductQuantity") { // New: Back from quantity, go to product selection
    currentStep = "selectProduct";
    currentInput = "";
    fetchProducts(); // Re-fetch products for the current retailer
  } else if (currentStep === "addToCartOptions") { // New: Back from cart options, go to quantity selection
    currentStep = "selectProductQuantity";
    ussdInput = `Weka idadi ya ${orderDetails.cart[orderDetails.cart.length - 1].product.product_name}:`;
    currentInput = "";
  } else if (currentStep === "enterName") { // From entering name, go back to add to cart options (if cart not empty) or product selection
    if (orderDetails.cart.length > 0) {
      currentStep = "addToCartOptions";
      showAddToCartOptions();
    } else { // Should not happen with new flow, but as fallback
      currentStep = "selectProduct";
      fetchProducts();
    }
    currentInput = "";
  } else if (currentStep === "enterPhoneNumber") {
    currentStep = "enterName";
    currentInput = "";
    ussdInput = "Weka jina lako:";
  } else if (currentStep === "enterLocation") {
    currentStep = "enterPhoneNumber";
    currentInput = "";
    ussdInput = "Weka nambari yako ya simu:";
  } else if (currentStep === "confirmOrder") {
    currentStep = "enterLocation";
    currentInput = "";
    ussdInput = "Weka eneo lako:";
  } else if (currentStep === "orderSuccess") {
    currentStep = "start";
    ussdInput = "Weka *# kuanza";
    currentInput = "";
    resetCustomer();
  } else {
    // Default fallback for any other unexpected state
    ussdInput = "bofya *# kuanza";
    currentInput = "";
    currentStep = "start";
    userRole = null;
    resetCustomer(); // Ensure full reset if getting stuck
  }
}

function retailerGoBack() {
  if (currentStep === "retailerMenu") {
    currentStep = "start";
    ussdInput = "bofya *# kuanza";
    currentInput = "";
    userRole = null;
    currentRetailerId = null;
    loginAttempts = 0; // Reset login attempts on full logout
  } else if (currentStep === "enterRetailerName") {
    currentStep = "retailerMenu";
    currentInput = "";
    ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n0. Rudi";
  } else if (currentStep === "enterRetailerPhone") {
    currentStep = "enterRetailerName";
    currentInput = "";
    ussdInput = "Weka jina lako:";
  } else if (currentStep === "enterRetailerLocation") {
    currentStep = "enterRetailerPhone";
    currentInput = "";
    ussdInput = "Weka nambari yako ya simu:";
  } else if (currentStep === "enterRetailerTin") { // New: Back from entering TIN
    currentStep = "enterRetailerLocation";
    currentInput = "";
    ussdInput = "Weka eneo lako:";
  }
  else if (currentStep === "productMenu") {
    currentStep = "retailerMenu";
    currentInput = "";
    ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n0. Rudi";
  } else if (currentStep === "addProductName") {
    currentStep = "productMenu";
    currentInput = "";
    showProductMenu();
  } else if (currentStep === "addProductPrice") {
    currentStep = "addProductName";
    currentInput = "";
    ussdInput = "Weka jina la bidhaa:";
  } else if (currentStep === "listProducts") {
    currentStep = "productMenu";
    currentInput = "";
    showProductMenu();
  } else if (currentStep === "productAction") {
    currentStep = "listProducts";
    currentInput = "";
    fetchRetailerProducts();
  } else if (currentStep === "editProductName") {
    currentStep = "productAction";
    currentInput = "";
    ussdInput = `Bidhaa: ${retailerDetails.selectedProduct.product_name}\n1. Badili\n2. Futa\n0. Rudi`;
  } else if (currentStep === "editProductPrice") {
    currentStep = "editProductName";
    currentInput = "";
    ussdInput = `Badili jina (sasa: ${retailerDetails.selectedProduct.product_name}):`;
  } else if (currentStep === "selectOrderToActOn" || currentStep === "ordersList") { // ordersList is for when no orders or after action
    currentStep = "retailerMenu";
    currentInput = "";
    ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n0. Rudi";
    selectedOrder = null;
  } else if (currentStep === "orderAction") {
    currentStep = "selectOrderToActOn";
    // Re-display the list of orders to choose from
    fetchRetailerOrders(""); // Pass empty string to re-show full list, or previously entered customer name
    selectedOrder = null;
  }
  else if (currentStep === "retailerLoginName") {
    currentStep = "retailerMenu";
    currentInput = "";
    ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n0. Rudi";
    retailerDetails.loginName = "";
    retailerDetails.loginTin = "";
  } else if (currentStep === "retailerLoginTin") { // Changed from retailerLoginId
    currentStep = "retailerLoginName";
    currentInput = "";
    ussdInput = "Weka jina lako la mchuuzi:";
    retailerDetails.loginTin = "";
  } else if (currentStep === "editRetailerName") {
    currentStep = "retailerMenu"; // After editing, go back to main retailer menu
    currentInput = "";
    ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n0. Rudi";
  } else if (currentStep === "editRetailerPhone") {
    currentStep = "editRetailerName";
    currentInput = "";
    ussdInput = `Badili jina (sasa: ${retailerDetails.name}):`;
  } else if (currentStep === "editRetailerLocation") {
    currentStep = "editRetailerPhone";
    currentInput = "";
    ussdInput = `Badili nambari ya simu (sasa: ${retailerDetails.phoneNumber}):`;
  } else if (currentStep === "editRetailerTin") { // New: Back from editing TIN
    currentStep = "editRetailerLocation";
    currentInput = "";
    ussdInput = `Badili eneo (sasa: ${retailerDetails.location}):`;
  }
  else {
    currentInput = "";
  }
}

function sendInput() {
  highlightButton(document.getElementById("sendButton"));
  let userInputText = currentInput.trim();

  if (currentStep === "start") {
    if (userInputText === "*#") {
      ussdInput = "Chagua chaguo:\n1. Mteja\n2. Mfanyabiashara";
      currentStep = "selectRole";
      currentInput = "";
    } else {
      ussdInput = "Nambari ya USSD si sahihi. bofya *# kuanza.";
      currentInput = "";
    }
    updateDisplay();
    return;
  }

  if (currentStep === "selectRole") {
    if (userInputText === "1") {
      userRole = "customer";
      currentInput = "";
      fetchRetailers();
    } else if (userInputText === "2") {
      userRole = "retailer";
      currentStep = "retailerMenu";
      currentInput = "";
      ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n0. Rudi";
    } else {
      ussdInput = "Chaguo si sahihi. Weka 1 au 2.";
      currentInput = "";
    }
    updateDisplay();
    return;
  }

  if (userRole === "customer") {
    handleCustomerInput(userInputText);
  } else if (userRole === "retailer") {
    handleRetailerInput(userInputText);
  }

  currentInput = "";
  updateDisplay();
}

// Customer functionality
function handleCustomerInput(userInput) {
  switch (currentStep) {
    case "selectRetailer":
      const retailerIndex = parseInt(userInput) - 1;
      if (!isNaN(retailerIndex) && retailerIndex >= 0 && retailerIndex < retailerList.length) {
        orderDetails.retailer = retailerList[retailerIndex];
        orderDetails.cart = []; // Clear cart for new retailer selection
        currentStep = "selectProduct";
        fetchProducts();
      } else if (userInput === "0") {
        customerGoBack(); // Go back to role selection
      } else {
        ussdInput = "Chaguo si sahihi. Tafadhali jaribu tena.";
      }
      break;

    case "selectProduct":
      const productIndex = parseInt(userInput) - 1;
      if (!isNaN(productIndex) && productIndex >= 0 && productIndex < productList.length) {
        // Store the selected product temporarily to ask for quantity
        orderDetails.currentProductSelection = productList[productIndex];
        currentStep = "selectProductQuantity";
        ussdInput = `Weka idadi ya ${productList[productIndex].product_name}:`;
      } else if (userInput === "0") {
        customerGoBack(); // Go back to retailer selection
      } else {
        ussdInput = "Chaguo si sahihi. Tafadhali jaribu tena.";
      }
      break;

    case "selectProductQuantity": // New Case: Get quantity for selected product
      const quantity = parseInt(userInput);
      if (!isNaN(quantity) && quantity > 0) {
        const selectedProductWithQuantity = {
          product: orderDetails.currentProductSelection,
          quantity: quantity
        };
        orderDetails.cart.push(selectedProductWithQuantity);
        orderDetails.currentProductSelection = null; // Clear temporary selection
        currentStep = "addToCartOptions";
        showAddToCartOptions();
      } else if (userInput === "0") { // Allow going back from quantity selection
        customerGoBack();
      } else {
        ussdInput = "Idadi si sahihi. Tafadhali weka nambari chanya.";
      }
      break;

    case "addToCartOptions": // New Case: Ask to add more or checkout
      if (userInput === "1") {
        currentStep = "selectProduct";
        fetchProducts(); // Loop back to product selection
      } else if (userInput === "2") {
        if (orderDetails.cart.length > 0) {
          currentStep = "enterName";
          ussdInput = "Weka jina lako:";
        } else {
          ussdInput = "Mkokoteni hauna bidhaa. Tafadhali ongeza bidhaa kwanza.";
          currentStep = "selectProduct"; // Go back to product selection
          fetchProducts();
        }
      } else if (userInput === "0") {
        customerGoBack(); // Go back (should be to quantity selection or product selection based on logic)
      } else {
        ussdInput = "Chaguo si sahihi. Weka 1 kuongeza zaidi, 2 kulipa, au 0 kurudi.";
      }
      break;

    case "enterName":
      orderDetails.name = userInput;
      currentStep = "enterPhoneNumber";
      ussdInput = "Weka nambari yako ya simu:";
      break;

    case "enterPhoneNumber":
      orderDetails.phoneNumber = userInput;
      currentStep = "enterLocation";
      ussdInput = "Weka eneo lako:";
      break;

    case "enterLocation":
      orderDetails.location = userInput;
      currentStep = "confirmOrder";
      showOrderConfirmation();
      break;

    case "confirmOrder":
      if (userInput === "1") {
        placeOrder();
      } else if (userInput === "2") {
        resetCustomer();
        ussdInput = "Agizo limeghairi. bofya *# kuanza tena.";
        currentStep = "start";
      } else if (userInput === "0") { // Allow going back from confirmation
        customerGoBack();
      } else {
        ussdInput = "Chaguo si sahihi. Weka 1 kukubali, 2 kughairi, au 0 kurudi.";
      }
      break;

    case "orderSuccess":
      // User is informed, and 0 will take them back to start
      if (userInput === "0") {
        resetCustomer();
        ussdInput = "bofya *# kuanza";
        currentStep = "start";
      } else {
        ussdInput = "Chaguo si sahihi. Weka 0 kurudi kuanza.";
      }
      break;

    default:
      ussdInput = "Hali si sahihi. Tafadhali anza upya.";
      break;
  }
}

function fetchRetailers() {
  fetch("http://localhost:3001/api/retailers")
    .then(response => response.json())
    .then(data => {
      retailerList = data;
      ussdInput = "Chagua Mfanyabiashara:\n";
      retailerList.forEach((retailer, index) => {
        ussdInput += `${index + 1}. ${retailer.name} (${retailer["phone_number"]})\n`;
      });
      ussdInput += "0. Rudi"; // Added "0. Rudi" option
      currentStep = "selectRetailer";
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kupata wafanyabiashara";
      updateDisplay();
      console.error(err);
    });
}

function fetchProducts() {
  const retailerId = orderDetails.retailer.retailer_id;
  fetch(`http://localhost:3001/api/products/${retailerId}`)
    .then(response => response.json())
    .then(data => {
      productList = data;
      ussdInput = "Chagua bidhaa:\n";
      productList.forEach((product, index) => {
        ussdInput += `${index + 1}. ${product.product_name} - TSH ${product.product_cost}\n`;
      });
      ussdInput += "0. Rudi"; // Added "0. Rudi" option
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kupata bidhaa";
      updateDisplay();
      console.error(err);
    });
}

function showAddToCartOptions() {
  let currentCartSummary = "";
  if (orderDetails.cart.length > 0) {
    currentCartSummary = "\nBidhaa Zilizopo kwenye Mkokoteni:\n";
    orderDetails.cart.forEach(item => {
      currentCartSummary += `- ${item.product.product_name} (x${item.quantity}) - TSH ${item.product.product_cost * item.quantity}\n`;
    });
    currentCartSummary += `Jumla ya Gharama: TSH ${calculateCartTotal()}\n`;
  }

  ussdInput = `Bidhaa imeongezwa kwenye mkokoteni.${currentCartSummary}\n
Chagua:\n1. Ongeza bidhaa nyingine\n2. Maliza agizo\n0. Rudi`;
  updateDisplay();
}

function calculateCartTotal() {
  return orderDetails.cart.reduce((total, item) => total + (item.product.product_cost * item.quantity), 0);
}


function showOrderConfirmation() {
  let orderSummary = `Hakiki agizo:\n
Jina: ${orderDetails.name}
Simu: ${orderDetails.phoneNumber}
Eneo: ${orderDetails.location}
Mfanyabiashara: ${orderDetails.retailer.name}\n
Bidhaa Zilizochaguliwa:\n`;

  orderDetails.cart.forEach(item => {
    orderSummary += `- ${item.product.product_name} (x${item.quantity}) - TSH ${item.product.product_cost * item.quantity}\n`;
  });

  orderSummary += `Jumla ya Gharama: TSH ${calculateCartTotal()}\n
1. Kukubali
2. Kughairi
0. Rudi`; // Added "0. Rudi" option
  ussdInput = orderSummary;
  updateDisplay();
}

function placeOrder() {
  const orderItems = orderDetails.cart.map(item => ({
    productId: item.product.product_id,
    quantity: item.quantity,
    price: item.product.product_cost // Include price for backend calculation/record
  }));

  fetch("http://localhost:3001/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: orderDetails.name,
      phoneNumber: orderDetails.phoneNumber,
      location: orderDetails.location,
      retailerId: orderDetails.retailer.retailer_id,
      items: orderItems // Send array of items
    }),
  })
    .then(response => response.json())
    .then(data => {
      currentStep = "orderSuccess";
      ussdInput = `Agizo limefanikiwa!\n
Nambari ya Agizo: ${data.orderId}
Mfanyabiashara: ${orderDetails.retailer.name}
Jumla ya Kiasi: TSH ${calculateCartTotal()}\n
Ndugu mteja!.
utapigiwa simu punde kupokea agizo lako na kulipia bidhaa.
Ahsante!\n
0. Rudi`; // Added "0. Rudi" option
      updateDisplay();
      resetCustomer(); // Reset after successful order
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kutuma agizo. Tafadhali jaribu tena.\n0. Rudi"; // Added "0. Rudi" option
      updateDisplay();
      console.error(err);
      currentStep = "confirmOrder"; // Allow user to go back or retry
    });
}

function resetCustomer() {
  currentStep = "start";
  userRole = null;
  currentInput = "";
  orderDetails = {
    name: "",
    phoneNumber: "",
    location: "",
    cart: [], // Reset cart
    retailer: null,
    currentProductSelection: null // Reset temp selection
  };
  retailerList = [];
  productList = [];
}

// Retailer functionality (No changes here, as per your request, focusing only on customer multi-item order)
function handleRetailerInput(userInput) {
  switch (currentStep) {
    case "retailerMenu":
      if (userInput === "1") {
        currentStep = "enterRetailerName";
        ussdInput = "Weka jina lako:";
      } else if (userInput === "2") { // Duka la Bidhaa (Product Shop)
        if (currentRetailerId) {
          currentStep = "productMenu";
          showProductMenu();
        } else {
          // If not logged in, initiate login process
          currentStep = "retailerLoginName";
          ussdInput = "Weka jina lako la mchuuzi ili uingie:";
        }
      } else if (userInput === "3") { // Badili Usajili (Edit Registration)
        if (currentRetailerId) {
          // Fetch current details to pre-fill or show
          fetchRetailerDetailsForEdit();
        } else {
          currentStep = "retailerLoginName";
          ussdInput = "Weka jina lako la mchuuzi ili uingie:";
          retailerDetails.nextAction = "editRegistration"; // Set next action after login
        }
      } else if (userInput === "4") { // Angalia Amri (View Orders)
        if (currentRetailerId) {
          // Immediately fetch all orders without asking for customer name
          fetchRetailerOrders(""); // Pass empty string to get all orders
          // currentStep will be set to "selectOrderToActOn" inside fetchRetailerOrders
        } else {
          currentStep = "retailerLoginName";
          ussdInput = "Weka jina lako la mchuuzi ili uingie:";
          retailerDetails.nextAction = "viewOrders"; // Set next action after login
        }
      } else if (userInput === "0") {
        currentStep = "start";
        ussdInput = "bofya *# kuanza";
        userRole = null;
      } else {
        ussdInput = "Chaguo si sahihi. Weka 1, 2, 3, 4 au 0.";
      }
      break;

    case "retailerLoginName":
      retailerDetails.loginName = userInput;
      currentStep = "retailerLoginTin"; // Changed to retailerLoginTin
      ussdInput = "Weka nambari yako ya TIN ya mfanyabiashara:"; // Updated prompt
      break;

    case "retailerLoginTin": // Changed from retailerLoginId
      retailerDetails.loginTin = userInput;
      retailerLogin();
      break;

    case "enterRetailerName":
      retailerDetails.name = userInput;
      currentStep = "enterRetailerPhone";
      ussdInput = "Weka nambari yako ya simu:";
      break;

    case "enterRetailerPhone":
      retailerDetails.phoneNumber = userInput;
      currentStep = "enterRetailerLocation";
      ussdInput = "Weka eneo lako:";
      break;

    case "enterRetailerLocation":
      retailerDetails.location = userInput;
      currentStep = "enterRetailerTin"; // New step to get TIN for registration
      ussdInput = "Weka nambari yako ya TIN (Mfano: TIN-123456):";
      break;

    case "enterRetailerTin": // New: Handle TIN input for registration
      retailerDetails.tinNumber = userInput;
      registerRetailer();
      break;

    case "registrationSuccess":
      if (userInput === "1") {
        currentStep = "productMenu";
        showProductMenu();
      } else if (userInput === "2") {
        currentStep = "start";
        ussdInput = "bofya *# kuanza";
        userRole = null;
        currentRetailerId = null;
      } else {
        ussdInput = "Chaguo si sahihi. Weka 1 au 2.";
      }
      break;

    case "productMenu":
      if (userInput === "1") {
        currentStep = "addProductName";
        productAction = "add";
        ussdInput = "Weka jina la bidhaa:";
      } else if (userInput === "2") {
        currentStep = "listProducts";
        fetchRetailerProducts();
      } else if (userInput === "0") {
        currentStep = "retailerMenu";
        ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n0. Rudi";
      } else {
        ussdInput = "Chaguo si sahihi. Weka 1 au 2.";
      }
      break;

    case "addProductName":
      retailerDetails.productName = userInput;
      currentStep = "addProductPrice";
      ussdInput = "Weka bei ya bidhaa (TSH):";
      break;

    case "addProductPrice":
      retailerDetails.productPrice = userInput;
      addProduct();
      break;

    case "listProducts":
      const productIndex = parseInt(userInput) - 1;
      if (!isNaN(productIndex) && productIndex >= 0 && productIndex < products.length) {
        currentStep = "productAction";
        retailerDetails.selectedProduct = products[productIndex];
        ussdInput = `Bidhaa: ${products[productIndex].product_name}\n1. Badili\n2. Futa\n0. Rudi`;
      } else if (userInput === "0") {
        currentStep = "productMenu";
        showProductMenu();
      } else {
        ussdInput = "Chaguo si sahihi. Tafadhali jaribu tena.";
      }
      break;

    case "productAction":
      if (userInput === "1") {
        currentStep = "editProductName";
        productAction = "edit";
        ussdInput = `Badili jina (sasa: ${retailerDetails.selectedProduct.product_name}):`;
      } else if (userInput === "2") {
        deleteProduct();
      } else if (userInput === "0") {
        currentStep = "productMenu";
        showProductMenu();
      } else {
        ussdInput = "Chaguo si sahihi. Weka 1, 2 au 0.";
      }
      break;

    case "editProductName":
      retailerDetails.newProductName = userInput;
      currentStep = "editProductPrice";
      ussdInput = `Badili bei (sasa: ${retailerDetails.selectedProduct.product_cost}):`;
      break;

    case "editProductPrice":
      retailerDetails.newProductPrice = userInput;
      updateProduct();
      break;

    case "editRetailerName": // New: For editing retailer details
      retailerDetails.name = userInput;
      currentStep = "editRetailerPhone";
      ussdInput = `Badili nambari ya simu (sasa: ${retailerDetails.phoneNumber}):`;
      break;

    case "editRetailerPhone": // New: For editing retailer details
      retailerDetails.phoneNumber = userInput;
      currentStep = "editRetailerLocation";
      ussdInput = `Badili eneo (sasa: ${retailerDetails.location}):`;
      break;

    case "editRetailerLocation": // New: For editing retailer details
      retailerDetails.location = userInput;
      currentStep = "editRetailerTin"; // New: Edit TIN
      ussdInput = `Badili nambari ya TIN (sasa: ${retailerDetails.tinNumber}):`; // New prompt
      break;

    case "editRetailerTin": // New: For editing retailer TIN
      retailerDetails.tinNumber = userInput;
      updateRetailerDetails();
      break;

    case "selectOrderToActOn": // New: Select an order to approve/reject
      const orderIndex = parseInt(userInput) - 1;
      if (!isNaN(orderIndex) && orderIndex >= 0 && orderIndex < orders.length) {
        selectedOrder = orders[orderIndex];
        currentStep = "orderAction";
        // Construct product summary for display in order action
        let productSummaryForAction = selectedOrder.items.map(item => `${item.product_name} (x${item.quantity}) - TSH ${item.product_cost}`).join(', ');
        ussdInput = `Agizo #${selectedOrder.order_id} - ${selectedOrder.customer_name}\nBidhaa: ${productSummaryForAction}\nHali ya sasa: ${selectedOrder.order_status}\n\n1. Pitisha\n2. Kataa\n0. Rudi`;
      } else if (userInput === "0") {
        currentStep = "retailerMenu";
        ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n0. Rudi";
      } else {
        ussdInput = "Chaguo si sahihi. Tafadhali weka nambari ya agizo au 0 kurudi.";
      }
      break;

    case "orderAction": // New: Approve or Reject
      if (userInput === "1") {
        updateOrderStatus('agizo limepitishwa');
      } else if (userInput === "2") {
        updateOrderStatus('rejected');
      } else if (userInput === "0") {
        selectedOrder = null; // Clear selected order
        currentStep = "ordersList"; // Go back to ordersList after action, prompting for "0. Rudi"
        fetchRetailerOrders(""); // Re-fetch orders to show updated status immediately
      } else {
        ussdInput = "Chaguo si sahihi. Weka 1 Pitisha, 2 Kataa, au 0 Rudi.";
      }
      break;

    case "ordersList": // This state is for when no orders are found, or after an action when we display "0. Rudi"
      if (userInput === "0") {
        currentStep = "retailerMenu";
        ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n0. Rudi";
      } else {
        ussdInput = "Chaguo si sahihi. Weka 0 kurudi.";
      }
      break;

    default:
      ussdInput = "Hali si sahihi. Tafadhali anza upya.";
      break;
  }
}

function showProductMenu() {
  ussdInput = "Usimamizi wa Bidhaa:\n1. Ongeza Bidhaa\n2. Tazama/Badili Bidhaa\n0. Rudi";
  updateDisplay();
}

function registerRetailer() {
  fetch("http://localhost:3001/api/retailers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: retailerDetails.name,
      phoneNumber: retailerDetails.phoneNumber,
      location: retailerDetails.location,
      tinNumber: retailerDetails.tinNumber // Added TIN to registration
    })
  })
    .then(response => response.json())
    .then(data => {
      currentRetailerId = data.retailerId;
      ussdInput = `Usajili umefanikiwa!\n
Nambari ya Mfanyabiashara: ${data.retailerId}
Jina: ${retailerDetails.name}
Simu: ${retailerDetails.phoneNumber}
Eneo: ${retailerDetails.location}
TIN: ${retailerDetails.tinNumber}\n
Chagua:\n1. Duka la Bidhaa\n2. Maliza`;
      currentStep = "registrationSuccess";
      resetRetailerButKeepId();
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kusajili. Tafadhali jaribu tena.";
      updateDisplay();
      console.error(err);
    });
}

// New function for retailer login
function retailerLogin() {
  fetch("http://localhost:3001/api/retailers/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: retailerDetails.loginName,
      tinNumber: retailerDetails.loginTin // Changed from retailerId to tinNumber
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        currentRetailerId = data.retailer.retailer_id;
        retailerDetails.name = data.retailer.name; // Store retailer name for edit
        retailerDetails.phoneNumber = data.retailer.phone_number; // Store retailer phone for edit
        retailerDetails.location = data.retailer.location; // Store retailer location for edit
        retailerDetails.tinNumber = data.retailer.tin_number; // Store retailer TIN for edit
        loginAttempts = 0; // Reset attempts on successful login
        ussdInput = "Umeingia kwa mafanikio!\n\nMenyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n0. Rudi";
        currentStep = "retailerMenu";

        // Redirect to the intended action after login if set
        if (retailerDetails.nextAction === "editRegistration") {
          fetchRetailerDetailsForEdit();
          retailerDetails.nextAction = ""; // Clear the action
        } else if (retailerDetails.nextAction === "viewOrders") {
          fetchRetailerOrders(""); // Call fetcher directly
          retailerDetails.nextAction = ""; // Clear the action
        }
      } else {
        loginAttempts++;
        if (loginAttempts >= 3) {
          ussdInput = "Jaribio nyingi za kuingia. Tafadhali jaribu tena baadaye.\n\n0. Rudi";
          currentStep = "retailerMenu"; // Go back to main menu
          currentRetailerId = null; // Clear ID to force re-login
        } else {
          ussdInput = `Jina au Nambari ya TIN si sahihi. Jaribu tena. (Jaribio ${loginAttempts}/3)\n\nWeka jina lako la mchuuzi:`;
          currentStep = "retailerLoginName";
        }
      }
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa la mtandao au seva. Tafadhali jaribu tena.";
      currentStep = "retailerMenu"; // Fallback to retailer menu on error
      updateDisplay();
      console.error(err);
    });
}

// New function to fetch retailer details for editing
function fetchRetailerDetailsForEdit() {
  if (!currentRetailerId) {
    ussdInput = "Tafadhali ingia kwanza.";
    currentStep = "retailerLoginName";
    updateDisplay();
    return;
  }
  // We'll pre-fill with the currently stored retailerDetails after login.
  // In a real application, you might fetch these from the server.
  ussdInput = `Badili Usajili:\n
Jina (sasa: ${retailerDetails.name || 'N/A'}):`;
  currentStep = "editRetailerName";
  updateDisplay();
}

// New function to update retailer details
function updateRetailerDetails() {
  if (!currentRetailerId) {
    ussdInput = "Tafadhali ingia kwanza.";
    currentStep = "retailerLoginName";
    updateDisplay();
    return;
  }

  fetch(`http://localhost:3001/api/retailers/${currentRetailerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: retailerDetails.name,
      phoneNumber: retailerDetails.phoneNumber,
      location: retailerDetails.location,
      tinNumber: retailerDetails.tinNumber // Added TIN to update
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        ussdInput = `Maelezo ya usajili yamebadilishwa kikamilifu!\n
Jina: ${retailerDetails.name}
Simu: ${retailerDetails.phoneNumber}
Eneo: ${retailerDetails.location}
TIN: ${retailerDetails.tinNumber}\n
0. Rudi`;
        currentStep = "retailerMenu"; // Go back to main retailer menu
      } else {
        ussdInput = "Kosa wakati wa kubadilisha maelezo. Tafadhali jaribu tena.";
        currentStep = "retailerMenu"; // Go back to main retailer menu
      }
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa la mtandao au seva wakati wa kubadilisha maelezo. Tafadhali jaribu tena.";
      currentStep = "retailerMenu"; // Fallback
      updateDisplay();
      console.error(err);
    });
}

function resetRetailerButKeepId() {
  currentInput = "";
  retailerDetails = {
    name: "",
    phoneNumber: "",
    location: "",
    productName: "",
    productPrice: "",
    selectedProduct: null,
    newProductName: "",
    newProductPrice: "",
    loginName: "",
    loginTin: "", // Reset loginTin
    tinNumber: "" // Reset tinNumber for registration
  };
}

function fetchRetailerProducts() {
  if (!currentRetailerId) {
    ussdInput = "Tafadhali ingia kwanza.";
    currentStep = "retailerLoginName";
    updateDisplay();
    return;
  }

  fetch(`http://localhost:3001/api/products/${currentRetailerId}`)
    .then(response => response.json())
    .then(data => {
      products = data;
      if (products.length === 0) {
        ussdInput = "Hakuna bidhaa zilizopatikana.\n1. Ongeza Bidhaa\n0. Rudi";
        currentStep = "productMenu";
      } else {
        ussdInput = "Chagua bidhaa kusimamia:\n";
        products.forEach((product, index) => {
          ussdInput += `${index + 1}. ${product.product_name} - TSH ${product.product_cost}\n`;
        });
        ussdInput += "0. Rudi";
        currentStep = "listProducts";
      }
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kupata bidhaa";
      updateDisplay();
      console.error(err);
    });
}

function addProduct() {
  if (!currentRetailerId) {
    ussdInput = "Tafadhani ingia kwanza.";
    currentStep = "retailerLoginName";
    updateDisplay();
    return;
  }

  fetch("http://localhost:3001/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: retailerDetails.productName,
      price: retailerDetails.productPrice,
      retailerId: currentRetailerId
    })
  })
    .then(response => response.json())
    .then(data => {
      ussdInput = `Bidhaa imeongezwa kikamilifu!\n
Nambari ya Bidhaa: ${data.productId}
Jina: ${retailerDetails.productName}
Bei: TSH ${retailerDetails.productPrice}\n
Bidhaa sasa inapatikana kwa wateja.\n
0. Rudi`;
      currentStep = "productMenu";
      retailerDetails.productName = "";
      retailerDetails.productPrice = "";
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kuongeza bidhaa. Tafadhali jaribu tena.";
      updateDisplay();
      console.error(err);
    });
}

function updateProduct() {
  if (!currentRetailerId) {
    ussdInput = "Tafadhali ingia kwanza.";
    currentStep = "retailerLoginName";
    updateDisplay();
    return;
  }

  fetch(`http://localhost:3001/api/products/${retailerDetails.selectedProduct.product_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: retailerDetails.newProductName,
      price: retailerDetails.newProductPrice
    })
  })
    .then(response => response.json())
    .then(data => {
      ussdInput = `Bidhaa imebadilishwa kikamilifu!\n
Nambari ya Bidhaa: ${retailerDetails.selectedProduct.product_id}
Jina Jipya: ${retailerDetails.newProductName}
Bei Jipya: TSH ${retailerDetails.newProductPrice}\n
Mabadiliko yanaonekana kwa wateja.\n
0. Rudi`;
      currentStep = "productMenu";
      retailerDetails.selectedProduct = null;
      retailerDetails.newProductName = "";
      retailerDetails.newProductPrice = "";
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kusahihisha bidhaa. Tafadhali jaribu tena.";
      updateDisplay();
      console.error(err);
    });
}

function deleteProduct() {
  if (!currentRetailerId) {
    ussdInput = "Tafadhali ingia kwanza.";
    currentStep = "retailerLoginName";
    updateDisplay();
    return;
  }

  fetch(`http://localhost:3001/api/products/${retailerDetails.selectedProduct.product_id}`, {
    method: "DELETE"
  })
    .then(response => response.json())
    .then(data => {
      ussdInput = `Bidhaa imefutwa kikamilifu!\n
Bidhaa: ${retailerDetails.selectedProduct.product_name}
Bei: TSH ${retailerDetails.selectedProduct.product_cost}\n
Bidhaa sasa haipatikani kwa wateja.\n
0. Rudi`;
      currentStep = "productMenu";
      retailerDetails.selectedProduct = null;
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kufuta bidhaa. Tafadhali jaribu tena.";
      updateDisplay();
      console.error(err);
    });
}

// Function to fetch retailer orders
function fetchRetailerOrders(customerName = "") {
  if (!currentRetailerId) {
    ussdInput = "Tafadhali ingia kwanza.";
    currentStep = "retailerLoginName";
    updateDisplay();
    return;
  }

  let url = `http://localhost:3001/api/retailers/${currentRetailerId}/orders`;
  if (customerName) {
    url += `?customerName=${encodeURIComponent(customerName)}`;
  }

  fetch(url)
    .then(response => response.json())
    .then(data => {
      orders = data;
      ussdInput = "Maagizo:\n";
      if (orders.length === 0) {
        ussdInput += "Hakuna maagizo yaliyopatikana.";
        ussdInput += "\n0. Rudi";
        currentStep = "ordersList"; // Still ordersList, but no actions
      } else {
        orders.forEach((order, index) => {
          let productSummary = order.items.map(item => `${item.product_name} (x${item.quantity}) - TSH ${item.product_cost}`).join(', '); //
          ussdInput += `${index + 1}. Jina: ${order.customer_name}, Simu: ${order.phone_number}, Bidhaa: ${productSummary}, Eneo: ${order.location}, Hali: ${order.order_status}\n`; //
        });
        ussdInput += "\nChagua agizo (nambari) kulichukulia hatua, au 0 kurudi.";
        currentStep = "selectOrderToActOn"; // New step to select order
      }
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kupata maagizo. Tafadhali jaribu tena.";
      updateDisplay();
      console.error(err);
    });
}

// New function to update order status (approve/reject)
function updateOrderStatus(status) {
  if (!currentRetailerId || !selectedOrder) {
    ussdInput = "Kosa: Hakuna agizo au mchuuzi aliyeingia.";
    currentStep = "retailerMenu";
    updateDisplay();
    return;
  }

  fetch(`http://localhost:3001/api/orders/${selectedOrder.order_id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: status })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        ussdInput = `Agizo #${selectedOrder.order_id} limesasishwa kuwa: ${status === 'agizo limepitishwa' ? 'Imepitishwa' : 'Limekataliwa'}\n\n0. Rudi`;
        selectedOrder = null; // Clear selected order
        currentStep = "ordersList"; // Go back to ordersList after action, prompting for "0. Rudi"
        fetchRetailerOrders(""); // Re-fetch orders to show updated status immediately
      } else {
        ussdInput = `Kosa: ${data.error || 'Imeshindikana kusasisha hali ya agizo.'}\n\n0. Rudi`;
        currentStep = "ordersList";
        fetchRetailerOrders(""); // Attempt to re-fetch
      }
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa la mtandao au seva wakati wa kusasisha hali ya agizo. Tafadhali jaribu tena.\n\n0. Rudi";
      currentStep = "ordersList";
      updateDisplay();
      console.error(err);
    });
}


function resetRetailer() {
  currentStep = "start";
  userRole = null;
  currentInput = "";
  currentRetailerId = null;
  retailerDetails = {
    name: "",
    phoneNumber: "",
    location: "",
    productName: "",
    productPrice: "",
    selectedProduct: null,
    newProductName: "",
    newProductPrice: "",
    loginName: "",
    loginTin: "", // Reset loginTin
    tinNumber: "" // Reset tinNumber
  };
  loginAttempts = 0;
}

// Add cursor blinking effect
function blinkCursor() {
  const cursor = document.getElementById("cursor");
  cursorVisible = !cursorVisible;
  cursor.style.visibility = cursorVisible ? "visible" : "hidden";
}
setInterval(blinkCursor, 600);

// Add keyboard support
document.addEventListener('keydown', function (event) {
  const key = event.key;

  if (key >= '0' && key <= '9') {
    cycleInput(key);
  } else if (key === '*') {
    cycleInput('*');
  } else if (key === '#') {
    cycleInput('#');
  } else if (key === ' ') {
    cycleInput(' ');
  } else if (key === 'Backspace' || key === 'Delete') {
    deleteInput();
  } else if (key === 'Enter') {
    sendInput();
  } else if (key === 'Escape') {
    goBack();
  }
});

// Initialize
updateDisplay();