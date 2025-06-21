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
let customerOrders = []; // NEW: To store fetched customer orders
let selectedOrderForFeedback = null; // NEW: To store the order chosen for feedback
let selectedProductForFeedback = null; // NEW: To store the product chosen for feedback

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
let orders = []; // To store fetched retailer orders
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
    (currentStep === "addToCartOptions" && !currentInput) || // New: for cart options
    (currentStep === "customerMenu" && !currentInput) || // NEW: Customer menu
    (currentStep === "enterCustomerPhoneNumberForOrders" && !currentInput) || // NEW: Customer phone for orders
    (currentStep === "viewCustomerOrders" && !currentInput) || // NEW: View customer orders
    (currentStep === "customerSelectFeedbackType" && !currentInput) || // NEW: Select feedback type
    (currentStep === "customerSelectProductForFeedback" && !currentInput) || // NEW: Select product for feedback
    (currentStep === "customerProvideFeedback" && !currentInput) || // NEW: Provide feedback
    (currentStep === "feedbackSuccess" && !currentInput) || // NEW: Feedback success
    (currentStep === "viewFeedback" && !currentInput)) { // NEW: View feedback
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
  if (currentStep === "customerMenu") { // NEW: From customer menu, go to role selection
    currentStep = "selectRole";
    ussdInput = "Chagua chaguo:\n1. Mteja\n2. Mfanyabiashara";
    currentInput = "";
    userRole = null; // Reset role if going back from initial selection
  } else if (currentStep === "selectRetailer") { // From retailer selection, go to customer menu
    currentStep = "customerMenu";
    ussdInput = "Menyu ya Mteja:\n1. Tuma Agizo Jipya\n2. Angalia Maagizo Yangu\n0. Rudi";
    currentInput = "";
  } else if (currentStep === "selectProduct") { // From product selection, go to retailer selection
    currentStep = "selectRetailer";
    currentInput = "";
    fetchRetailers(); // Re-fetch retailers list
  } else if (currentStep === "selectProductQuantity") { // Back from quantity, go to product selection
    currentStep = "selectProduct";
    currentInput = "";
    fetchProducts(); // Re-fetch products for the current retailer
  } else if (currentStep === "addToCartOptions") { // Back from cart options, go to quantity selection
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
    currentStep = "customerMenu"; // Go back to customer menu
    ussdInput = "Menyu ya Mteja:\n1. Tuma Agizo Jipya\n2. Angalia Maagizo Yangu\n0. Rudi";
    currentInput = "";
    resetCustomerDetails(); // Reset only order details, not the entire customer state
  } else if (currentStep === "enterCustomerPhoneNumberForOrders") { // NEW: From entering customer phone, go to customer menu
    currentStep = "customerMenu";
    ussdInput = "Menyu ya Mteja:\n1. Tuma Agizo Jipya\n2. Angalia Maagizo Yangu\n0. Rudi";
    currentInput = "";
  } else if (currentStep === "viewCustomerOrders") { // NEW: From viewing customer orders, go to customer menu
    currentStep = "customerMenu";
    ussdInput = "Menyu ya Mteja:\n1. Tuma Agizo Jipya\n2. Angalia Maagizo Yangu\n0. Rudi";
    currentInput = "";
    customerOrders = []; // Clear viewed orders
    selectedOrderForFeedback = null; // NEW: Clear selected order for feedback
  } else if (currentStep === "customerSelectFeedbackType") { // NEW: Back from feedback type selection
    currentStep = "viewCustomerOrders";
    showCustomerOrdersForFeedback(); // Re-display orders with feedback option
  } else if (currentStep === "customerSelectProductForFeedback") { // NEW: Back from product selection for feedback
    currentStep = "customerSelectFeedbackType";
    ussdInput = "Chagua aina ya maoni:\n1. Kwa Mfanyabiashara\n2. Kwa Bidhaa\n0. Rudi";
  } else if (currentStep === "customerProvideFeedback") { // NEW: Back from providing feedback
    if (selectedProductForFeedback) {
      currentStep = "customerSelectProductForFeedback";
      showProductsForFeedback(selectedOrderForFeedback);
    } else {
      currentStep = "customerSelectFeedbackType";
      ussdInput = "Chagua aina ya maoni:\n1. Kwa Mfanyabiashara\n2. Kwa Bidhaa\n0. Rudi";
    }
  } else if (currentStep === "feedbackSuccess") { // NEW: Back from feedback success
    currentStep = "customerMenu";
    ussdInput = "Menyu ya Mteja:\n1. Tuma Agizo Jipya\n2. Angalia Maagizo Yangu\n0. Rudi";
  }
  else {
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
    ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n5. Angalia Mauzo ya Siku\n6. Angalia Maoni\n0. Rudi";
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
    ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n5. Angalia Mauzo ya Siku\n6. Angalia Maoni\n0. Rudi";
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
    ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n5. Angalia Mauzo ya Siku\n6. Angalia Maoni\n0. Rudi";
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
    ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n5. Angalia Mauzo ya Siku\n6. Angalia Maoni\n0. Rudi";
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
    ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n5. Angalia Mauzo ya Siku\n6. Angalia Maoni\n0. Rudi";
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
  } else if (currentStep === "viewDailySales") { // NEW: Back from daily sales view
    currentStep = "retailerMenu";
    currentInput = "";
    ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n5. Angalia Mauzo ya Siku\n6. Angalia Maoni\n0. Rudi";
  } else if (currentStep === "viewFeedback") { // NEW: Back from feedback view
    currentStep = "retailerMenu";
    currentInput = "";
    ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n5. Angalia Mauzo ya Siku\n6. Angalia Maoni\n0. Rudi";
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
      currentStep = "customerMenu"; // NEW: Go to customer menu
      ussdInput = "Menyu ya Mteja:\n1. Tuma Agizo Jipya\n2. Angalia Maagizo Yangu\n0. Rudi"; // NEW: Customer menu options
    } else if (userInputText === "2") {
      userRole = "retailer";
      currentStep = "retailerMenu";
      currentInput = "";
      ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n5. Angalia Mauzo ya Siku\n6. Angalia Maoni\n0. Rudi";
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
    case "customerMenu": // NEW: Handle input from customer main menu
      if (userInput === "1") {
        currentStep = "selectRetailer";
        fetchRetailers(); // Proceed to place new order
      } else if (userInput === "2") {
        currentStep = "enterCustomerPhoneNumberForOrders"; // Proceed to view past orders
        ussdInput = "Weka nambari yako ya simu kuona maagizo:";
      } else if (userInput === "0") {
        customerGoBack(); // Go back to role selection
      } else {
        ussdInput = "Chaguo si sahihi. Weka 1, 2 au 0.";
      }
      break;

    case "enterCustomerPhoneNumberForOrders": // NEW: Handle customer phone number input for orders
      orderDetails.phoneNumber = userInput; // Reuse orderDetails.phoneNumber for this purpose
      fetchCustomerOrders(userInput);
      break;

    case "viewCustomerOrders": // NEW: Handle input from customer orders view
      const selectedOrderIndex = parseInt(userInput) - 1; // Assuming user selects an order to give feedback on

      if (!isNaN(selectedOrderIndex) && selectedOrderIndex >= 0 && selectedOrderIndex < customerOrders.length) {
        selectedOrderForFeedback = customerOrders[selectedOrderIndex]; // Store the selected order
        currentStep = "customerSelectFeedbackType";
        ussdInput = `Chagua aina ya maoni kwa agizo #${selectedOrderForFeedback.order_id}:\n1. Kwa Mfanyabiashara\n2. Kwa Bidhaa\n0. Rudi`;
      } else if (userInput === "0") {
        customerGoBack(); // Go back to customer menu
      } else {
        ussdInput = "Chaguo si sahihi. Tafadhali chagua nambari ya agizo, au 0 kurudi.";
      }
      break;

    case "customerSelectFeedbackType": // NEW: Handle feedback type selection
      if (userInput === "1") { // Feedback for Retailer
        currentStep = "customerProvideFeedback";
        ussdInput = `Weka maoni yako kwa mfanyabiashara ${selectedOrderForFeedback.retailer_name} kuhusu agizo #${selectedOrderForFeedback.order_id}:`;
        selectedProductForFeedback = null; // Ensure product feedback is cleared
      } else if (userInput === "2") { // Feedback for Product
        if (selectedOrderForFeedback && selectedOrderForFeedback.items && selectedOrderForFeedback.items.length > 0) {
          currentStep = "customerSelectProductForFeedback";
          showProductsForFeedback(selectedOrderForFeedback);
        } else {
          ussdInput = "Hakuna bidhaa katika agizo hili la kutoa maoni. Tafadhali chagua aina nyingine au rudi.\n1. Kwa Mfanyabiashara\n0. Rudi";
        }
      } else if (userInput === "0") {
        customerGoBack(); // Go back to view customer orders
      } else {
        ussdInput = "Chaguo si sahihi. Weka 1 kwa Mfanyabiashara, 2 kwa Bidhaa, au 0 kurudi.";
      }
      break;

    case "customerSelectProductForFeedback": // NEW: Handle product selection for feedback
      const feedbackProductIndex = parseInt(userInput) - 1; // Renamed variable
      if (!isNaN(feedbackProductIndex) && feedbackProductIndex >= 0 && feedbackProductIndex < selectedOrderForFeedback.items.length) {
        selectedProductForFeedback = selectedOrderForFeedback.items[feedbackProductIndex];
        currentStep = "customerProvideFeedback";
        ussdInput = `Weka maoni yako kwa bidhaa ${selectedProductForFeedback.product_name} kutoka kwa mfanyabiashara ${selectedOrderForFeedback.retailer_name}:`;
      } else if (userInput === "0") {
        customerGoBack(); // Go back to feedback type selection
      } else {
        ussdInput = "Chaguo si sahihi. Tafadhali chagua nambari ya bidhaa au 0 kurudi.";
      }
      break;

    case "customerProvideFeedback": // NEW: Handle actual feedback input
      const feedbackText = userInput;
      if (feedbackText.length > 0) {
        sendFeedback(feedbackText);
      } else if (userInput === "0") {
        customerGoBack(); // Go back without sending feedback
      } else {
        ussdInput = "Maoni hayawezi kuwa tupu. Tafadhali weka maoni yako au 0 kurudi.";
      }
      break;

    case "feedbackSuccess": // NEW: After feedback is successfully sent
      if (userInput === "0") {
        customerGoBack(); // Go back to customer menu
      } else {
        ussdInput = "Chaguo si sahihi. Weka 0 kurudi.";
      }
      break;

    case "selectRetailer":
      const retailerIndex = parseInt(userInput) - 1;
      if (!isNaN(retailerIndex) && retailerIndex >= 0 && retailerIndex < retailerList.length) {
        orderDetails.retailer = retailerList[retailerIndex];
        orderDetails.cart = []; // Clear cart for new retailer selection
        currentStep = "selectProduct";
        fetchProducts();
      } else if (userInput === "0") {
        customerGoBack(); // Go back to customer menu
      } else {
        ussdInput = "Chaguo si sahihi. Tafadhali jaribu tena.";
      }
      break;

    case "selectProduct":
      const selectedProductOrderIndex = parseInt(userInput) - 1; // Renamed variable
      if (!isNaN(selectedProductOrderIndex) && selectedProductOrderIndex >= 0 && selectedProductOrderIndex < productList.length) {
        // Store the selected product temporarily to ask for quantity
        orderDetails.currentProductSelection = productList[selectedProductOrderIndex];
        currentStep = "selectProductQuantity";
        ussdInput = `Weka idadi ya ${productList[selectedProductOrderIndex].product_name}:`;
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

    case "enterPhoneNumber": // This is used for order placement customer's phone number
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
        resetCustomerDetails(); // Reset only order details
        ussdInput = "Agizo limeghairi. bofya *# kuanza tena."; // Maybe go back to customer menu?
        currentStep = "customerMenu";
        ussdInput = "Menyu ya Mteja:\n1. Tuma Agizo Jipya\n2. Angalia Maagizo Yangu\n0. Rudi";
      } else if (userInput === "0") { // Allow going back from confirmation
        customerGoBack();
      } else {
        ussdInput = "Chaguo si sahihi. Weka 1 kukubali, 2 kughairi, au 0 kurudi.";
      }
      break;

    case "orderSuccess":
      // User is informed, and 0 will take them back to customer menu
      if (userInput === "0") {
        customerGoBack(); // Go back to customer menu
      } else {
        ussdInput = "Chaguo si sahihi. Weka 0 kurudi.";
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
      resetCustomerDetails(); // Reset after successful order
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kutuma agizo. Tafadhali jaribu tena.\n0. Rudi"; // Added "0. Rudi" option
      updateDisplay();
      console.error(err);
      currentStep = "confirmOrder"; // Allow user to go back or retry
    });
}

// Resets only order-specific details after an order is placed/cancelled
function resetCustomerDetails() {
  orderDetails = {
    name: "",
    phoneNumber: "",
    location: "",
    cart: [],
    retailer: null,
    currentProductSelection: null
  };
  retailerList = []; // Clear for next potential order
  productList = []; // Clear for next potential order
}

// Full reset for customer role
function resetCustomer() {
  currentStep = "start";
  userRole = null;
  currentInput = "";
  resetCustomerDetails(); // Calls the specific reset for order details
  customerOrders = []; // NEW: Also clear customer orders
  selectedOrderForFeedback = null; // NEW: Clear selected order for feedback
  selectedProductForFeedback = null; // NEW: Clear selected product for feedback
}

// NEW FUNCTION: Fetch and display customer's past orders
function fetchCustomerOrders(phoneNumber) {
  fetch(`http://localhost:3001/api/customer-orders/${phoneNumber}`)
    .then(response => response.json())
    .then(data => {
      customerOrders = data;
      let ussdOutput = "Maagizo Yako ya Zamani:\n";
      if (customerOrders.length === 0) {
        ussdOutput += "Hakuna maagizo yaliyopatikana kwa nambari hii ya simu.";
      } else {
        customerOrders.forEach((order, index) => {
          // Calculate total for each order
          let orderTotal = order.items.reduce((sum, item) => sum + (item.product_cost * item.quantity), 0);
          ussdOutput += `\n${index + 1}. Agizo #${order.order_id} - ${order.customer_name}\n`; // Add index for selection
          ussdOutput += ` Mfanyabiashara: ${order.retailer_name}\n`; // Display retailer name
          ussdOutput += ` Hali: ${order.order_status}\n`;
          ussdOutput += ` Jumla: TSH ${orderTotal.toFixed(0)}\n`; // Display total for this order
        });
        ussdOutput += "\n\nChagua nambari ya agizo kutoa maoni, au 0 kurudi."; // Updated prompt
      }
      ussdOutput += "\n0. Rudi";
      ussdInput = ussdOutput;
      currentStep = "viewCustomerOrders";
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kupata maagizo. Tafadhali jaribu tena.\n\n0. Rudi";
      currentStep = "customerMenu"; // Fallback to customer menu on error
      updateDisplay();
      console.error(err);
    });
}

// NEW FUNCTION: Display products within a selected order for feedback
function showProductsForFeedback(order) {
  let ussdOutput = `Chagua bidhaa ya kutoa maoni kwa Agizo #${order.order_id}:\n`;
  order.items.forEach((item, index) => {
    ussdOutput += `${index + 1}. ${item.product_name} (x${item.quantity})\n`;
  });
  ussdOutput += "0. Rudi";
  ussdInput = ussdOutput;
  updateDisplay();
}

// NEW FUNCTION: Send feedback to backend
function sendFeedback(feedbackText) {
  let apiUrl = "";
  let body = {};

  if (selectedProductForFeedback) {
    // Product feedback
    apiUrl = "http://localhost:3001/api/feedback/product";
    body = {
      productId: selectedProductForFeedback.product_id,
      customerId: selectedOrderForFeedback.customer_id, // Assuming customer_id is available in order object
      orderId: selectedOrderForFeedback.order_id,
      feedback: feedbackText
    };
  } else if (selectedOrderForFeedback) {
    // Retailer feedback
    apiUrl = "http://localhost:3001/api/feedback/retailer";
    body = {
      retailerId: selectedOrderForFeedback.retailer_id,
      customerId: selectedOrderForFeedback.customer_id, // Assuming customer_id is available in order object
      orderId: selectedOrderForFeedback.order_id,
      feedback: feedbackText
    };
  } else {
    ussdInput = "Kosa: Hakuna agizo au bidhaa iliyochaguliwa kutoa maoni.\n0. Rudi";
    currentStep = "customerMenu";
    updateDisplay();
    return;
  }

  fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then(response => response.json())
    .then(data => {
      currentStep = "feedbackSuccess";
      ussdInput = `Maoni yako yametumwa kikamilifu. Ahsante!\n\n0. Rudi`;
      selectedOrderForFeedback = null;
      selectedProductForFeedback = null;
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kutuma maoni. Tafadhali jaribu tena.\n\n0. Rudi";
      currentStep = "customerProvideFeedback"; // Allow retry
      updateDisplay();
      console.error(err);
    });
}

// Retailer functionality
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
      } else if (userInput === "5") { // Angalia Mauzo ya Siku (View Daily Sales)
        if (currentRetailerId) {
          fetchDailySales();
        } else {
          currentStep = "retailerLoginName";
          ussdInput = "Weka jina lako la mchuuzi ili uingie:";
          retailerDetails.nextAction = "viewDailySales"; // Set next action after login
        }
      } else if (userInput === "6") { // NEW: Angalia Maoni (View Feedback)
        if (currentRetailerId) {
          fetchRetailerFeedback();
        } else {
          currentStep = "retailerLoginName";
          ussdInput = "Weka jina lako la mchuuzi ili uingie:";
          retailerDetails.nextAction = "viewFeedback"; // Set next action after login
        }
      } else if (userInput === "0") {
        currentStep = "start";
        ussdInput = "bofya *# kuanza";
        userRole = null;
      } else {
        ussdInput = "Chaguo si sahihi. Weka 1, 2, 3, 4, 5, 6 au 0."; // Updated options
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
      currentStep = "enterRetailerTin"; // New: Ask for TIN
      ussdInput = "Weka nambari yako ya TIN:";
      break;

    case "enterRetailerTin": // New: Handle TIN for registration
      retailerDetails.tinNumber = userInput;
      registerRetailer();
      break;

    case "productMenu":
      if (userInput === "1") {
        productAction = "add";
        currentStep = "addProductName";
        ussdInput = "Weka jina la bidhaa:";
      } else if (userInput === "2") {
        productAction = "view";
        currentStep = "listProducts";
        fetchRetailerProducts();
      } else if (userInput === "0") {
        retailerGoBack();
      } else {
        ussdInput = "Chaguo si sahihi. Weka 1 kuongeza, 2 kuona, au 0 kurudi.";
      }
      break;

    case "addProductName":
      retailerDetails.newProductName = userInput;
      currentStep = "addProductPrice";
      ussdInput = `Weka bei ya ${retailerDetails.newProductName}:`;
      break;

    case "addProductPrice":
      const price = parseFloat(userInput);
      if (!isNaN(price) && price > 0) {
        retailerDetails.newProductPrice = price;
        addProduct();
      } else {
        ussdInput = "Bei si sahihi. Tafadhali weka nambari chanya.";
      }
      break;

    case "listProducts":
      const productActionIndex = parseInt(userInput) - 1;
      if (!isNaN(productActionIndex) && productActionIndex >= 0 && productActionIndex < products.length) {
        retailerDetails.selectedProduct = products[productActionIndex];
        currentStep = "productAction";
        ussdInput = `Bidhaa: ${retailerDetails.selectedProduct.product_name}\n1. Badili\n2. Futa\n0. Rudi`;
      } else if (userInput === "0") {
        retailerGoBack();
      } else {
        ussdInput = "Chaguo si sahihi. Tafadhali chagua nambari ya bidhaa au 0 kurudi.";
      }
      break;

    case "productAction":
      if (userInput === "1") {
        currentStep = "editProductName";
        ussdInput = `Badili jina (sasa: ${retailerDetails.selectedProduct.product_name}):`;
      } else if (userInput === "2") {
        deleteProduct();
      } else if (userInput === "0") {
        retailerGoBack();
      } else {
        ussdInput = "Chaguo si sahihi. Weka 1 kubadili, 2 kufuta, au 0 kurudi.";
      }
      break;

    case "editProductName":
      retailerDetails.newProductName = userInput;
      currentStep = "editProductPrice";
      ussdInput = `Badili bei (sasa: TSH ${retailerDetails.selectedProduct.product_cost}):`;
      break;

    case "editProductPrice":
      const newPrice = parseFloat(userInput);
      if (!isNaN(newPrice) && newPrice > 0) {
        retailerDetails.newProductPrice = newPrice;
        editProduct();
      } else {
        ussdInput = "Bei si sahihi. Tafadhali weka nambari chanya.";
      }
      break;

    case "ordersList": // This state is reached after fetching orders
      if (userInput === "0") {
        retailerGoBack(); // Go back to retailer menu
      } else {
        // If a number is entered, try to select that order for action
        const orderIndex = parseInt(userInput) - 1;
        if (!isNaN(orderIndex) && orderIndex >= 0 && orderIndex < orders.length) {
          selectedOrder = orders[orderIndex]; // Store the selected order
          currentStep = "orderAction";
          ussdInput = `Agizo #${selectedOrder.order_id}:\n
  Jina: ${selectedOrder.customer_name}
  Simu: ${selectedOrder.phone_number}
  Eneo: ${selectedOrder.location}
  Hali: ${selectedOrder.order_status}\n
  Bidhaa:\n`;
          selectedOrder.items.forEach(item => {
            ussdInput += `- ${item.product_name} (x${item.quantity}) - TSH ${item.item_price * item.quantity}\n`;
          });
          ussdInput += `\n1. Kubali Agizo\n2. Kataa Agizo\n3. Kamilisha Agizo\n0. Rudi`;
        } else {
          ussdInput = "Chaguo si sahihi. Weka nambari ya agizo au 0 kurudi.";
        }
      }
      break;

    case "selectOrderToActOn": // If a search was performed and list is displayed
      const selectedOrderIndex = parseInt(userInput) - 1;
      if (!isNaN(selectedOrderIndex) && selectedOrderIndex >= 0 && selectedOrderIndex < orders.length) {
        selectedOrder = orders[selectedOrderIndex];
        currentStep = "orderAction";
        ussdInput = `Agizo #${selectedOrder.order_id}:\n
  Jina: ${selectedOrder.customer_name}
  Simu: ${selectedOrder.phone_number}
  Eneo: ${selectedOrder.location}
  Hali: ${selectedOrder.order_status}\n
  Bidhaa:\n`;
        selectedOrder.items.forEach(item => {
          ussdInput += `- ${item.product_name} (x${item.quantity}) - TSH ${item.item_price * item.quantity}\n`;
        });
        ussdInput += `\n1. Kubali Agizo\n2. Kataa Agizo\n3. Kamilisha Agizo\n0. Rudi`;
      } else if (userInput === "0") {
        retailerGoBack(); // Go back to retailer menu
      } else {
        ussdInput = "Chaguo si sahihi. Weka nambari ya agizo au 0 kurudi.";
      }
      break;

    case "orderAction":
      if (!selectedOrder) {
        ussdInput = "Hakuna agizo lililochaguliwa. Tafadhali rudi kwenye orodha ya maagizo.\n0. Rudi";
        currentStep = "ordersList"; // Fallback
        break;
      }
      if (userInput === "1") {
        updateOrderStatus(selectedOrder.order_id, 'agizo limekubaliwa'); // Accept
      } else if (userInput === "2") {
        updateOrderStatus(selectedOrder.order_id, 'agizo limekataliwa'); // Reject
      } else if (userInput === "3") {
        updateOrderStatus(selectedOrder.order_id, 'agizo limekamilika'); // Complete
      } else if (userInput === "0") {
        retailerGoBack(); // Go back to orders list
      } else {
        ussdInput = "Chaguo si sahihi. Weka 1 kukubali, 2 kukataa, 3 kukamilisha, au 0 kurudi.";
      }
      break;

    case "retailerRegistrationSuccess":
      if (userInput === "0") {
        retailerGoBack(); // Go back to main menu
      } else {
        ussdInput = "Chaguo si sahihi. Weka 0 kurudi.";
      }
      break;

    case "retailerLoginSuccess":
      if (userInput === "0") {
        retailerGoBack(); // Go back to main menu
      } else {
        ussdInput = "Chaguo si sahihi. Weka 0 kurudi.";
      }
      break;

    case "editRetailerName":
      retailerDetails.name = userInput;
      currentStep = "editRetailerPhone";
      ussdInput = `Badili nambari ya simu (sasa: ${retailerDetails.phoneNumber}):`;
      break;

    case "editRetailerPhone":
      retailerDetails.phoneNumber = userInput;
      currentStep = "editRetailerLocation";
      ussdInput = `Badili eneo (sasa: ${retailerDetails.location}):`;
      break;

    case "editRetailerLocation":
      retailerDetails.location = userInput;
      currentStep = "editRetailerTin"; // New: Edit TIN
      ussdInput = `Badili nambari ya TIN (sasa: ${retailerDetails.tinNumber}):`;
      break;

    case "editRetailerTin": // New: Handle editing TIN
      retailerDetails.tinNumber = userInput;
      updateRetailerDetails();
      break;

    case "retailerUpdateSuccess":
      if (userInput === "0") {
        retailerGoBack();
      } else {
        ussdInput = "Chaguo si sahihi. Weka 0 kurudi.";
      }
      break;

    case "viewDailySales": // NEW: Handle input from daily sales view
      if (userInput === "0") {
        retailerGoBack(); // Go back to retailer menu
      } else {
        ussdInput = "Chaguo si sahihi. Weka 0 kurudi.";
      }
      break;

    case "viewFeedback": // NEW: Handle input from feedback view
      if (userInput === "0") {
        retailerGoBack(); // Go back to retailer menu
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
  ussdInput = "Menyu ya Bidhaa:\n1. Ongeza Bidhaa Mpya\n2. Tazama Bidhaa Zangu\n0. Rudi";
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
      tinNumber: retailerDetails.tinNumber // Include TIN in registration
    }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        ussdInput = `Kosa: ${data.error}\n0. Rudi`;
        currentStep = "enterRetailerTin"; // Stay on this step to allow retry
      } else {
        currentRetailerId = data.retailerId; // Store the ID for future use
        currentStep = "retailerRegistrationSuccess";
        ussdInput = `Umefanikiwa kusajiliwa kama ${retailerDetails.name}. Karibu!\n0. Rudi`;
        // Clear registration details
        retailerDetails.name = "";
        retailerDetails.phoneNumber = "";
        retailerDetails.location = "";
        retailerDetails.tinNumber = "";
      }
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kusajili. Tafadhali jaribu tena.\n0. Rudi";
      currentStep = "enterRetailerTin"; // Stay on this step to allow retry
      updateDisplay();
      console.error(err);
    });
}

function retailerLogin() {
  fetch("http://localhost:3001/api/retailers/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: retailerDetails.loginName,
      tinNumber: retailerDetails.loginTin // Send TIN for login
    }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        currentRetailerId = data.retailer.retailer_id;
        retailerDetails.name = data.retailer.name;
        retailerDetails.phoneNumber = data.retailer.phone_number;
        retailerDetails.location = data.retailer.location;
        retailerDetails.tinNumber = data.retailer.tin_number;

        ussdInput = `Karibu ${retailerDetails.name}!\n0. Rudi`;
        currentStep = "retailerLoginSuccess";
        // Perform next action if set (e.g., view orders, edit registration)
        if (retailerDetails.nextAction === "viewOrders") {
          fetchRetailerOrders("");
          retailerDetails.nextAction = null; // Clear action
        } else if (retailerDetails.nextAction === "editRegistration") {
          fetchRetailerDetailsForEdit(); // Directly go to edit
          retailerDetails.nextAction = null; // Clear action
        } else if (retailerDetails.nextAction === "viewDailySales") {
          fetchDailySales();
          retailerDetails.nextAction = null; // Clear action
        } else if (retailerDetails.nextAction === "viewFeedback") {
          fetchRetailerFeedback();
          retailerDetails.nextAction = null; // Clear action
        }
        else {
          // Default to product menu or main retailer menu if no specific action
          currentStep = "retailerMenu";
          ussdInput = "Menyu ya Mfanyabiashara:\n1. Jisajili\n2. Duka la Bidhaa\n3. Badili Usajili\n4. Angalia Amri\n5. Angalia Mauzo ya Siku\n6. Angalia Maoni\n0. Rudi";
        }
      } else {
        loginAttempts++;
        if (loginAttempts >= 3) {
          ussdInput = "Umejitaidi mara nyingi. Tafadhali wasiliana na msimamizi. \n0. Rudi";
          currentStep = "retailerMenu"; // Go back to main menu after too many attempts
          loginAttempts = 0; // Reset
        } else {
          ussdInput = `Kosa: ${data.error} Jaribu tena. (Majaribio: ${loginAttempts}/3)\nWeka jina lako la mchuuzi:`;
          currentStep = "retailerLoginName"; // Keep on login step
          retailerDetails.loginName = ""; // Clear name for retry
          retailerDetails.loginTin = ""; // Clear TIN for retry
        }
      }
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa la mtandao wakati wa kuingia. Tafadhali jaribu tena.\n0. Rudi";
      currentStep = "retailerMenu";
      updateDisplay();
      console.error(err);
    });
}

function fetchRetailerDetailsForEdit() {
  // Assuming currentRetailerId is already set from login
  fetch(`http://localhost:3001/api/retailers/${currentRetailerId}`)
    .then(response => response.json())
    .then(data => {
      if (data.retailer) {
        retailerDetails.name = data.retailer.name;
        retailerDetails.phoneNumber = data.retailer.phone_number;
        retailerDetails.location = data.retailer.location;
        retailerDetails.tinNumber = data.retailer.tin_number; // Populate TIN
        currentStep = "editRetailerName";
        ussdInput = `Badili jina (sasa: ${retailerDetails.name}):`;
      } else {
        ussdInput = "Kosa wakati wa kupata maelezo ya mfanyabiashara. Tafadhali jaribu tena.\n0. Rudi";
        currentStep = "retailerMenu";
      }
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa la mtandao wakati wa kupata maelezo. Tafadhali jaribu tena.\n0. Rudi";
      currentStep = "retailerMenu";
      updateDisplay();
      console.error(err);
    });
}

function updateRetailerDetails() {
  fetch(`http://localhost:3001/api/retailers/${currentRetailerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: retailerDetails.name,
      phoneNumber: retailerDetails.phoneNumber,
      location: retailerDetails.location,
      tinNumber: retailerDetails.tinNumber // Include TIN in update
    }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        ussdInput = "Maelezo yako yamebadilishwa kikamilifu. Ahsante!\n0. Rudi";
        currentStep = "retailerUpdateSuccess";
      } else {
        ussdInput = `Kosa: ${data.error}\n0. Rudi`;
        currentStep = "editRetailerTin"; // Stay on edit step if error
      }
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa la mtandao wakati wa kubadili maelezo. Tafadhali jaribu tena.\n0. Rudi";
      currentStep = "editRetailerTin"; // Stay on edit step
      updateDisplay();
      console.error(err);
    });
}

function addProduct() {
  fetch("http://localhost:3001/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: retailerDetails.newProductName,
      price: retailerDetails.newProductPrice,
      retailerId: currentRetailerId,
    }),
  })
    .then(response => response.json())
    .then(data => {
      ussdInput = `Bidhaa "${retailerDetails.newProductName}" imeongezwa. \n0. Rudi`;
      currentStep = "productMenu"; // Go back to product menu after adding
      retailerDetails.newProductName = ""; // Clear for next input
      retailerDetails.newProductPrice = "";
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kuongeza bidhaa. Tafadhali jaribu tena.\n0. Rudi";
      updateDisplay();
      console.error(err);
    });
}

function fetchRetailerProducts() {
  fetch(`http://localhost:3001/api/products/${currentRetailerId}`)
    .then(response => response.json())
    .then(data => {
      products = data;
      let ussdOutput = "Bidhaa zako:\n";
      if (products.length === 0) {
        ussdOutput += "Hakuna bidhaa zilizopatikana. Weka 1 kuongeza bidhaa.";
      } else {
        products.forEach((product, index) => {
          ussdOutput += `${index + 1}. ${product.product_name} - TSH ${product.product_cost}\n`;
        });
        ussdOutput += "\nChagua nambari ya bidhaa kubadili/kufuta, au 0 kurudi.";
      }
      ussdInput = ussdOutput;
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kupata bidhaa zako. Tafadhali jaribu tena.\n0. Rudi";
      updateDisplay();
      console.error(err);
    });
}

function editProduct() {
  fetch(`http://localhost:3001/api/products/${retailerDetails.selectedProduct.product_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: retailerDetails.newProductName,
      price: retailerDetails.newProductPrice,
    }),
  })
    .then(response => response.json())
    .then(data => {
      ussdInput = `Bidhaa "${retailerDetails.selectedProduct.product_name}" imebadilishwa.\n0. Rudi`;
      currentStep = "productMenu"; // Go back to product menu
      retailerDetails.selectedProduct = null;
      retailerDetails.newProductName = "";
      retailerDetails.newProductPrice = "";
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kubadili bidhaa. Tafadhali jaribu tena.\n0. Rudi";
      updateDisplay();
      console.error(err);
    });
}

function deleteProduct() {
  fetch(`http://localhost:3001/api/products/${retailerDetails.selectedProduct.product_id}`, {
    method: "DELETE",
  })
    .then(response => response.json())
    .then(data => {
      ussdInput = `Bidhaa "${retailerDetails.selectedProduct.product_name}" imefutwa.\n0. Rudi`;
      currentStep = "productMenu"; // Go back to product menu
      retailerDetails.selectedProduct = null;
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kufuta bidhaa. Tafadhali jaribu tena.\n0. Rudi";
      updateDisplay();
      console.error(err);
    });
}

// Function to fetch orders for a retailer
function fetchRetailerOrders(customerNameFilter) {
  let url = `http://localhost:3001/api/retailers/${currentRetailerId}/orders`;
  if (customerNameFilter) {
    url += `?customerName=${encodeURIComponent(customerNameFilter)}`;
  }

  fetch(url)
    .then(response => response.json())
    .then(data => {
      orders = data;
      let ussdOutput = "Maagizo Yako:\n";
      if (orders.length === 0) {
        ussdOutput += "Hakuna maagizo yaliyopatikana.";
      } else {
        // Group orders by order_id
        const groupedOrders = {};
        data.forEach(item => {
          if (!groupedOrders[item.order_id]) {
            groupedOrders[item.order_id] = {
              order_id: item.order_id,
              customer_name: item.customer_name,
              phone_number: item.phone_number,
              location: item.location,
              order_status: item.order_status,
              created_at: item.created_at,
              items: []
            };
          }
          groupedOrders[item.order_id].items.push({
            product_name: item.product_name,
            quantity: item.quantity,
            item_price: parseFloat(item.item_price) // Ensure price is parsed as float
          });
        });

        // Display each order
        Object.values(groupedOrders).forEach((order, index) => {
          const total = order.items.reduce((sum, item) => sum + (item.item_price * item.quantity), 0);
          ussdOutput += `\n${index + 1}. Agizo #${order.order_id}\n`;
          ussdOutput += `  Mteja: ${order.customer_name}\n`;
          ussdOutput += `  Simu: ${order.phone_number}\n`;
          ussdOutput += `  Hali: ${order.order_status}\n`;
        });
      }
      ussdOutput += "\nChagua nambari ya agizo kuchagua au 0 kurudi.";
      ussdInput = ussdOutput;
      currentStep = "ordersList"; // Changed from "selectOrderToActOn"
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kupata maagizo. Tafadhali jaribu tena.\n0. Rudi";
      currentStep = "retailerMenu";
      updateDisplay();
      console.error(err);
    });
}

// Function to update order status (accept, reject, complete)
function updateOrderStatus(orderId, status) {
  fetch(`http://localhost:3001/api/orders/${orderId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: status }),
  })
    .then(response => response.json())
    .then(data => {
      ussdInput = `Hali ya agizo #${orderId} imebadilishwa kuwa: ${status.toUpperCase()}\n0. Rudi`;
      currentStep = "ordersList"; // Go back to orders list
      fetchRetailerOrders(""); // Refresh the list
      selectedOrder = null; // Clear selected order
      updateDisplay();
    })
    .catch(err => {
      ussdInput = "Kosa wakati wa kubadili hali ya agizo. Tafadhali jaribu tena.\n0. Rudi";
      updateDisplay();
      console.error(err);
    });
}

function fetchDailySales() {
  const today = new Date().toISOString().split('T')[0];

  fetch(`http://localhost:3001/api/retailers/${currentRetailerId}/daily-sales?date=${today}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      let ussdOutput = `Mauzo ya Leo (${today}):\n`;

      if (data.overallSales && data.overallSales.total_sales) {
        ussdOutput += `\nJumla ya Mauzo: TSH ${data.overallSales.total_sales.toFixed(0)}\n`;
        ussdOutput += `Jumla ya Maagizo: ${data.overallSales.total_orders}\n`;
      } else {
        ussdOutput += "\nHakuna mauzo yaliyopatikana kwa leo.\n";
      }

      if (data.productSales && data.productSales.length > 0) {
        ussdOutput += "\nMauzo ya Bidhaa:\n";
        data.productSales.forEach(product => {
          ussdOutput += `- ${product.product_name}: ${product.quantity_sold} (TSH ${product.total_product_cost.toFixed(0)})\n`;
        });
      } else {
        ussdOutput += "\nHakuna mauzo ya bidhaa yaliyopatikana kwa leo.\n";
      }

      ussdOutput += "\n0. Rudi";
      ussdInput = ussdOutput;
      currentStep = "viewDailySales";
      updateDisplay();
    })
    .catch(err => {
      console.error('Error fetching daily sales:', err);
      ussdInput = "Kosa wakati wa kupata mauzo ya siku. Tafadhali jaribu tena.\n\n0. Rudi";
      currentStep = "retailerMenu";
      updateDisplay();
    });
}

// NEW FUNCTION: Fetch and display retailer feedback
function fetchRetailerFeedback() {
  fetch(`http://localhost:3001/api/retailers/${currentRetailerId}/feedback`)
    .then(response => response.json())
    .then(data => {
      let ussdOutput = "Maoni Yanayohusiana Nawe:\n";

      // Display retailer feedback
      if (data.retailerFeedback && data.retailerFeedback.length > 0) {
        ussdOutput += "\nMaoni Kuhusu Duka Lako:\n";
        data.retailerFeedback.forEach((feedback, index) => {
          ussdOutput += `${index + 1}. Kutoka: ${feedback.customer_name}\n`;
          ussdOutput += `   Maoni: ${feedback.feedback_text}\n`;
          ussdOutput += `   Tarehe: ${new Date(feedback.created_at).toLocaleDateString()}\n\n`;
        });
      } else {
        ussdOutput += "\nHakuna maoni ya moja kwa moja kuhusu duka lako.\n";
      }

      // Display product feedback
      if (data.productFeedback && data.productFeedback.length > 0) {
        ussdOutput += "\nMaoni Kuhusu Bidhaa Zako:\n";
        data.productFeedback.forEach((feedback, index) => {
          ussdOutput += `${index + 1}. Bidhaa: ${feedback.product_name}\n`;
          ussdOutput += `   Kutoka: ${feedback.customer_name}\n`;
          ussdOutput += `   Maoni: ${feedback.feedback_text}\n`;
          ussdOutput += `   Tarehe: ${new Date(feedback.created_at).toLocaleDateString()}\n\n`;
        });
      } else {
        ussdOutput += "\nHakuna maoni kuhusu bidhaa zako.\n";
      }

      ussdOutput += "\n0. Rudi";
      ussdInput = ussdOutput;
      currentStep = "viewFeedback";
      updateDisplay();
    })
    .catch(err => {
      console.error('Error fetching feedback:', err);
      ussdInput = "Kosa wakati wa kupata maoni. Tafadhali jaribu tena.\n\n0. Rudi";
      currentStep = "retailerMenu";
      updateDisplay();
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
  } else if (key === 'Backspace') {
    deleteInput();
  } else if (key === 'Enter') {
    sendInput();
  } else if (key === 'ArrowLeft') {
    goBack();
  }
});